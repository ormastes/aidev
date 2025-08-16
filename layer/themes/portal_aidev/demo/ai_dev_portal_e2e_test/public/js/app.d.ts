interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}
interface Project {
    id: number;
    name: string;
    description: string;
    user_id: number;
    status: string;
    created_at: string;
    updated_at: string;
}
interface Feature {
    id: number;
    project_id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
}
interface Task {
    id: number;
    feature_id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
}
interface AppState {
    user: User | null;
    token: string | null;
    currentView: string;
    projects: Project[];
    features: Feature[];
    tasks: Task[];
    selectedProject?: Project;
    selectedFeature?: Feature;
}
interface ApiError {
    error: string;
}
declare const state: AppState;
declare function escapeHtml(unsafe: string): string;
declare function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T>;
declare function getElementById<T extends HTMLElement>(id: string): T;
declare function showLogin(): void;
declare function showDashboard(): void;
declare function showView(viewName: string): void;
declare function loadProjects(): Promise<void>;
declare function renderProjects(): void;
declare function selectProject(project: Project): Promise<void>;
declare function loadFeatures(): Promise<void>;
declare function renderFeatures(): void;
declare function selectFeature(feature: Feature): Promise<void>;
declare function loadTasks(): Promise<void>;
declare function renderTasks(): void;
declare function showProfile(): void;
declare function checkSession(): Promise<void>;
//# sourceMappingURL=app.d.ts.map