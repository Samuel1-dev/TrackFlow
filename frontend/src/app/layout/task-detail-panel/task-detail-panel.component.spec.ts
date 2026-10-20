import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { TaskDetailPanelComponent } from './task-detail-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FcfaPipe } from '../../shared/pipes/fcfa.pipe';

describe('TaskDetailPanelComponent', () => {
  let component: TaskDetailPanelComponent;
  let fixture: ComponentFixture<TaskDetailPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskDetailPanelComponent, IconComponent, FcfaPipe],
      imports: [HttpClientTestingModule, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
