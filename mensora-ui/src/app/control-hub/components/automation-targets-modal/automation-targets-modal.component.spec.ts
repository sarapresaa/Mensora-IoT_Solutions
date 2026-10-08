import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutomationTargetsModalComponent } from './automation-targets-modal.component';

describe('AutomationTargetsModalComponent', () => {
  let component: AutomationTargetsModalComponent;
  let fixture: ComponentFixture<AutomationTargetsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomationTargetsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutomationTargetsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
