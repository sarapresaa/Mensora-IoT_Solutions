import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

type OpenApiOperation = {
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: unknown;
};

type OpenApiPaths = Record<
  string,
  Record<string, OpenApiOperation>
>;

@Injectable()
export class DocsService {
  private docsDir = path.join(process.cwd(), 'docs');

  async generatePdf(): Promise<string> {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }

    const openapiPath = path.join(this.docsDir, 'openapi.json');
    const pdfPath = path.join(this.docsDir, 'api-docs.pdf');

    const res = await axios.get('http://localhost:3001/docs-json');
    const openapi = res.data as {
      openapi: string;
      info: any;
      paths: OpenApiPaths;
    };

    const filteredPaths: OpenApiPaths = {};

    for (const [route, methods] of Object.entries(openapi.paths)) {
      filteredPaths[route] = {};

      for (const [method, operation] of Object.entries(methods)) {
        filteredPaths[route][method] = {
          summary: operation.summary,
          description: operation.description,
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses ?? {},
        };
      }
    }

    const reducedOpenApi = {
      openapi: openapi.openapi,
      info: openapi.info,
      paths: filteredPaths,
    };

    fs.writeFileSync(openapiPath, JSON.stringify(reducedOpenApi, null, 2));

    await new Promise((resolve, reject) => {
      const cmd = `npx openapi2pdf --spec "${openapiPath}" --out "${pdfPath}"`;
      exec(cmd, (err) => (err ? reject(err) : resolve(null)));
    });

    return pdfPath;
  }
}