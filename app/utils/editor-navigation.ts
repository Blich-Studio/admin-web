import type { InjectionKey, Ref } from 'vue'

// The layout asks the active editor before clearing the authenticated session.
export const editorLogoutGuardKey: InjectionKey<Ref<(() => boolean) | null>> = Symbol('editorLogoutGuard')
