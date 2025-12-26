<script setup lang="ts">
import { useUsersStore, type UserRole, type UserListItem } from '~/stores/users'
import { useAuthStore } from '~/stores/auth'

const usersStore = useUsersStore()
const authStore = useAuthStore()

// State
const searchQuery = ref('')
const roleFilter = ref<UserRole | ''>('')
const verifiedFilter = ref<'' | 'true' | 'false'>('')
const currentPage = ref(1)
const isLoading = ref(true)
const loadError = ref<string | null>(null)

// Modal states
const showRoleModal = ref(false)
const showVerifyModal = ref(false)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)
const selectedUser = ref<UserListItem | null>(null)
const newRole = ref<UserRole>('reader')
const newPassword = ref('')
const sendPasswordEmail = ref(true)
const actionLoading = ref(false)

// Fetch users with filters
const fetchUsers = async () => {
  isLoading.value = true
  loadError.value = null
  try {
    await usersStore.fetchUsers({
      page: currentPage.value,
      limit: 20,
      role: roleFilter.value || undefined,
      isVerified: verifiedFilter.value ? verifiedFilter.value === 'true' : undefined,
      search: searchQuery.value || undefined,
    })
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load users'
  } finally {
    isLoading.value = false
  }
}

// Check admin access and initial fetch
onMounted(async () => {
  if (!authStore.isAdmin) {
    await navigateTo('/admin')
    return
  }
  await fetchUsers()
})

// Watch for filter changes
let debounceTimer: ReturnType<typeof setTimeout>
watch([searchQuery, roleFilter, verifiedFilter], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 300)
})

// Actions
const openRoleModal = (user: UserListItem) => {
  selectedUser.value = user
  newRole.value = user.role
  showRoleModal.value = true
}

const openVerifyModal = (user: UserListItem) => {
  selectedUser.value = user
  showVerifyModal.value = true
}

const openPasswordModal = (user: UserListItem) => {
  selectedUser.value = user
  newPassword.value = ''
  sendPasswordEmail.value = true
  showPasswordModal.value = true
}

const openDeleteModal = (user: UserListItem) => {
  selectedUser.value = user
  showDeleteModal.value = true
}

const updateRole = async () => {
  if (!selectedUser.value) return
  actionLoading.value = true
  try {
    await usersStore.updateRole(selectedUser.value.id, newRole.value)
    showRoleModal.value = false
  } catch (err) {
    console.error('Failed to update role:', err)
  } finally {
    actionLoading.value = false
  }
}

const toggleVerification = async () => {
  if (!selectedUser.value) return
  actionLoading.value = true
  try {
    await usersStore.updateVerification(selectedUser.value.id, !selectedUser.value.isVerified)
    showVerifyModal.value = false
    await fetchUsers()
  } catch (err) {
    console.error('Failed to update verification:', err)
  } finally {
    actionLoading.value = false
  }
}

const resetPassword = async () => {
  if (!selectedUser.value || !newPassword.value) return
  actionLoading.value = true
  try {
    await usersStore.resetPassword(selectedUser.value.id, newPassword.value, sendPasswordEmail.value)
    showPasswordModal.value = false
    newPassword.value = ''
  } catch (err) {
    console.error('Failed to reset password:', err)
  } finally {
    actionLoading.value = false
  }
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  actionLoading.value = true
  try {
    await usersStore.deleteUser(selectedUser.value.id)
    showDeleteModal.value = false
  } catch (err) {
    console.error('Failed to delete user:', err)
  } finally {
    actionLoading.value = false
  }
}

const closeModals = () => {
  showRoleModal.value = false
  showVerifyModal.value = false
  showPasswordModal.value = false
  showDeleteModal.value = false
  selectedUser.value = null
}

const formatDate = (date: string | null) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getRoleBadgeClass = (role: UserRole) => {
  switch (role) {
    case 'admin': return 'role-badge--admin'
    case 'writer': return 'role-badge--writer'
    case 'reader': return 'role-badge--reader'
    default: return ''
  }
}
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Users</h1>
        <p class="page-header__subtitle">Manage user accounts and permissions</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="admin-card" style="margin-bottom: 1.5rem;">
      <div class="admin-card__body" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input"
            placeholder="Search by email, nickname..."
          >
        </div>
        <div class="form-group" style="min-width: 150px; margin-bottom: 0;">
          <select v-model="roleFilter" class="form-select">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="writer">Writer</option>
            <option value="reader">Reader</option>
          </select>
        </div>
        <div class="form-group" style="min-width: 150px; margin-bottom: 0;">
          <select v-model="verifiedFilter" class="form-select">
            <option value="">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="admin-card">
      <!-- Error State -->
      <div v-if="loadError" class="empty-state">
        <Icon name="lucide:alert-circle" class="empty-state__icon" style="color: #ef4444;" />
        <h4 class="empty-state__title">Failed to load users</h4>
        <p class="empty-state__text">{{ loadError }}</p>
        <button class="btn btn--primary" @click="fetchUsers">
          <Icon name="lucide:refresh-cw" />
          Try Again
        </button>
      </div>

      <div v-else-if="isLoading" class="loading-spinner">
        <div class="loading-spinner__icon" />
      </div>

      <template v-else-if="usersStore.users.length">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in usersStore.users" :key="user.id">
              <td class="admin-table__user">
                <div class="user-info">
                  <div class="user-info__avatar">
                    <img
                      v-if="user.avatarUrl"
                      :src="user.avatarUrl"
                      :alt="user.nickname"
                    >
                    <span v-else>{{ user.nickname.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div>
                    <div class="user-info__name">{{ user.nickname }}</div>
                    <div class="user-info__email">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['role-badge', getRoleBadgeClass(user.role)]">
                  {{ user.role }}
                </span>
              </td>
              <td>
                <span :class="['status-badge', user.isVerified ? 'status-badge--published' : 'status-badge--draft']">
                  {{ user.isVerified ? 'Verified' : 'Unverified' }}
                </span>
              </td>
              <td class="admin-table__meta">{{ formatDate(user.createdAt) }}</td>
              <td class="admin-table__meta">{{ formatDate(user.lastLoginAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button
                    class="btn btn--ghost btn--sm"
                    title="Change Role"
                    :disabled="user.id === authStore.user?.id"
                    @click="openRoleModal(user)"
                  >
                    <Icon name="lucide:shield" />
                  </button>
                  <button
                    class="btn btn--ghost btn--sm"
                    :title="user.isVerified ? 'Unverify' : 'Verify'"
                    @click="openVerifyModal(user)"
                  >
                    <Icon :name="user.isVerified ? 'lucide:shield-check' : 'lucide:shield-x'" />
                  </button>
                  <button
                    class="btn btn--ghost btn--sm"
                    title="Reset Password"
                    @click="openPasswordModal(user)"
                  >
                    <Icon name="lucide:key" />
                  </button>
                  <button
                    class="btn btn--ghost btn--sm"
                    title="Delete User"
                    :disabled="user.id === authStore.user?.id || user.role === 'admin'"
                    @click="openDeleteModal(user)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="(usersStore.meta?.totalPages ?? 0) > 1" class="pagination">
          <button
            class="btn btn--secondary btn--sm"
            :disabled="!(usersStore.meta?.hasPrev)"
            @click="currentPage--; fetchUsers()"
          >
            Previous
          </button>
          <span class="pagination__info">
            Page {{ usersStore.meta?.page ?? 1 }} of {{ usersStore.meta?.totalPages ?? 1 }}
          </span>
          <button
            class="btn btn--secondary btn--sm"
            :disabled="!(usersStore.meta?.hasNext)"
            @click="currentPage++; fetchUsers()"
          >
            Next
          </button>
        </div>
      </template>

      <div v-else class="empty-state">
        <Icon name="lucide:users" class="empty-state__icon" />
        <h4 class="empty-state__title">No users found</h4>
        <p class="empty-state__text">Try adjusting your filters</p>
      </div>
    </div>

    <!-- Role Modal -->
    <Teleport to="body">
      <div v-if="showRoleModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3>Change User Role</h3>
            <button class="modal__close" @click="closeModals">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>Change role for <strong>{{ selectedUser?.nickname }}</strong></p>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select v-model="newRole" class="form-select">
                <option value="reader">Reader - Can comment and like</option>
                <option value="writer">Writer - Can create and edit own content</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="closeModals">Cancel</button>
            <button class="btn btn--primary" :disabled="actionLoading" @click="updateRole">
              {{ actionLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Verify Modal -->
    <Teleport to="body">
      <div v-if="showVerifyModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3>{{ selectedUser?.isVerified ? 'Unverify' : 'Verify' }} User</h3>
            <button class="modal__close" @click="closeModals">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>
              Are you sure you want to {{ selectedUser?.isVerified ? 'unverify' : 'verify' }}
              <strong>{{ selectedUser?.nickname }}</strong>?
            </p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="closeModals">Cancel</button>
            <button
              :class="['btn', selectedUser?.isVerified ? 'btn--warning' : 'btn--success']"
              :disabled="actionLoading"
              @click="toggleVerification"
            >
              {{ actionLoading ? 'Processing...' : (selectedUser?.isVerified ? 'Unverify' : 'Verify') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Password Reset Modal -->
    <Teleport to="body">
      <div v-if="showPasswordModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3>Reset Password</h3>
            <button class="modal__close" @click="closeModals">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>Reset password for <strong>{{ selectedUser?.nickname }}</strong></p>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input
                v-model="newPassword"
                type="text"
                class="form-input"
                placeholder="Enter new password (min 8 characters)"
                minlength="8"
              >
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input v-model="sendPasswordEmail" type="checkbox">
                <span>Send password notification email to user</span>
              </label>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="closeModals">Cancel</button>
            <button
              class="btn btn--primary"
              :disabled="actionLoading || newPassword.length < 8"
              @click="resetPassword"
            >
              {{ actionLoading ? 'Resetting...' : 'Reset Password' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3>Delete User</h3>
            <button class="modal__close" @click="closeModals">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>
              Are you sure you want to delete <strong>{{ selectedUser?.nickname }}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="closeModals">Cancel</button>
            <button class="btn btn--danger" :disabled="actionLoading" @click="deleteUser">
              {{ actionLoading ? 'Deleting...' : 'Delete User' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: oklch(0.68 0.14 45);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1rem;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__name {
    font-weight: 500;
  }

  &__email {
    font-size: 0.8125rem;
    color: oklch(0.62 0.02 280);
  }
}

.role-badge {
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;

  &--admin {
    background: oklch(0.55 0.18 25 / 0.2);
    color: oklch(0.65 0.18 25);
  }

  &--writer {
    background: oklch(0.68 0.14 45 / 0.2);
    color: oklch(0.68 0.14 45);
  }

  &--reader {
    background: oklch(0.62 0.02 280 / 0.2);
    color: oklch(0.72 0.02 280);
  }
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid oklch(0.24 0.025 285);

  &__info {
    font-size: 0.875rem;
    color: oklch(0.62 0.02 280);
  }
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  input {
    width: 1rem;
    height: 1rem;
  }
}
</style>
