import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

// Core
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Shared
import { IconComponent } from './shared/components/icon/icon.component';
import { FcfaPipe } from './shared/pipes/fcfa.pipe';

// Layout
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { TaskDetailPanelComponent } from './layout/task-detail-panel/task-detail-panel.component';
import { MainLayoutComponent } from './layout/main-layout.component';

// Features
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { TasksComponent } from './features/tasks/tasks.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { BudgetsComponent } from './features/finance/budgets.component';
import { ExpensesComponent } from './features/finance/expenses.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';

@NgModule({
  declarations: [
    App,
    IconComponent,
    FcfaPipe,
    SidebarComponent,
    HeaderComponent,
    TaskDetailPanelComponent,
    MainLayoutComponent,
    DashboardComponent,
    TasksComponent,
    ProjectsComponent,
    BudgetsComponent,
    ExpensesComponent,
    LoginComponent,
    RegisterComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App],
})
export class AppModule {}
