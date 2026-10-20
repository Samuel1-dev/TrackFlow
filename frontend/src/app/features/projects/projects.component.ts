import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProjectsService } from '../../core/services/projects.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { Project } from '../../core/models/project.models';

@Component({
  selector: 'app-projects',
  standalone: false,
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  openModal = false;
  private subs: Subscription = new Subscription();

  newProj = {
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
  };

  constructor(
    private projectsService: ProjectsService,
    private taskSelectionService: TaskSelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadProjects();

    // Recharger les projets pour recalculer les barres d'avancement si une tâche change
    this.subs.add(
      this.taskSelectionService.taskCreated$.subscribe(() => {
        this.loadProjects();
      }),
    );
    this.subs.add(
      this.taskSelectionService.taskUpdated$.subscribe(() => {
        this.loadProjects();
      }),
    );
    this.subs.add(
      this.taskSelectionService.taskDeleted$.subscribe(() => {
        this.loadProjects();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadProjects() {
    this.projectsService.findAll().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.cdr.detectChanges();
      },
    });
  }

  createProject() {
    if (!this.newProj.title) return;
    this.projectsService
      .create({
        title: this.newProj.title,
        description: this.newProj.description,
        startDate: new Date(this.newProj.startDate).toISOString(),
      })
      .subscribe({
        next: (created) => {
          this.openModal = false;
          this.newProj.title = '';
          this.newProj.description = '';
          this.projects.unshift(created);
          this.taskSelectionService.notifyProjectCreated(created);
          this.cdr.detectChanges();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la création'),
      });
  }
}
