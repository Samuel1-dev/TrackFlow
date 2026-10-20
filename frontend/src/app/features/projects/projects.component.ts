import { Component, OnInit } from '@angular/core';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.models';

@Component({
  selector: 'app-projects',
  standalone: false,
  template: `
    <div class="space-y-6 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Projets</h1>
          <p class="text-xs text-slate-400 mt-1">Suivez l'avancement global et la progression de vos chantiers</p>
        </div>
        <button
          (click)="openModal = true"
          class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <app-icon name="plus" [size]="15"></app-icon>
          <span>Nouveau projet</span>
        </button>
      </div>

      <!-- Projects Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (project of projects; track project.id) {
          <div class="rounded-3xl bg-white dark:bg-surface-cardDark p-6 border border-slate-100 dark:border-slate-800 shadow-card flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                  {{ project.status }}
                </span>
                <span class="text-xs font-bold text-slate-400">
                  {{ project.stats?.progressPercent || 0 }}%
                </span>
              </div>

              <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                {{ project.title }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                {{ project.description || 'Aucune description fournie.' }}
              </p>
            </div>

            <div class="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <!-- Progress bar -->
              <div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                    [style.width.%]="project.stats?.progressPercent || 0"
                  ></div>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{{ project.stats?.total || 0 }} tâches</span>
                <span class="text-emerald-600 dark:text-emerald-400">{{ project.stats?.done || 0 }} terminées</span>
                @if (project.stats?.overdue; as overdue) {
                  @if (overdue > 0) {
                    <span class="text-rose-600 dark:text-rose-400">{{ overdue }} en retard</span>
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Create Project Modal -->
      @if (openModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div (click)="openModal = false" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-md bg-white dark:bg-surface-cardDark rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-10 animate-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Créer un nouveau projet</h3>
              <button (click)="openModal = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <app-icon name="x" [size]="18"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="createProject()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Titre du projet *</label>
                <input
                  type="text"
                  [(ngModel)]="newProj.title"
                  name="title"
                  required
                  placeholder="ex: Refonte TaskFlow"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  [(ngModel)]="newProj.description"
                  name="description"
                  rows="3"
                  placeholder="Objectifs et livrables..."
                  class="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Date de début *</label>
                <input
                  type="date"
                  [(ngModel)]="newProj.startDate"
                  name="startDate"
                  required
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  (click)="openModal = false"
                  class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20"
                >
                  Créer le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  openModal = false;

  newProj = {
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
  };

  constructor(private projectsService: ProjectsService) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectsService.findAll().subscribe({
      next: (projects) => (this.projects = projects),
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
        next: () => {
          this.openModal = false;
          this.newProj.title = '';
          this.newProj.description = '';
          this.loadProjects();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la création'),
      });
  }
}
