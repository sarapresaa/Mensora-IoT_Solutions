# Mensora IoT Solutions

Plataforma web de automação doméstica e monitorização de consumo energético, com Angular, NestJS, MySQL e dispositivos Shelly. Projeto de grupo.

## Tecnologias
Angular · NestJS · TypeScript · MySQL · Shelly

## Estrutura
- `mensora-ui/`: interface web em Angular
- `mensora/`: API em NestJS e ligação à base de dados

## Executar localmente

Instala as dependências em cada pasta com `npm install`.

No back-end, cria um ficheiro `mensora/.env` a partir de `mensora/.env.example` e define a palavra-passe da tua base de dados MySQL. A configuração utiliza a base de dados e o utilizador `mensora`.

```bash
cd mensora
npm run start:dev
```

Noutro terminal, inicia a interface:

```bash
cd mensora-ui
npm start
```

## Sobre esta cópia
Código importado a partir do ZIP do projeto de grupo. O arquivo não inclui o histórico Git original. Os créditos e ficheiros existentes do projeto foram preservados.

## A minha contribuição
- Coordenação do grupo: organização de tarefas e prazos
- Elaboração dos relatórios e das apresentações do projeto
- Design da interface e desenvolvimento de componentes front-end (Angular)
- Apoio no back-end e na base de dados, na ligação do front-end aos dados
