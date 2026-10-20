import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from './main-layout.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { TaskDetailPanelComponent } from '../task-detail-panel/task-detail-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { FcfaPipe } from '../../shared/pipes/fcfa.pipe';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        MainLayoutComponent,
        SidebarComponent,
        HeaderComponent,
        TaskDetailPanelComponent,
        IconComponent,
        FcfaPipe,
      ],
      imports: [HttpClientTestingModule, RouterTestingModule, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
