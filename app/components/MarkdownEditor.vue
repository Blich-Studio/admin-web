<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// View mode: 'edit' | 'split' | 'preview'
const viewMode = ref<'edit' | 'split' | 'preview'>('split')

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showImagePicker = ref(false)
const selectedImageUrl = ref<string | null>(null)

// Render markdown preview
const renderedPreview = computed(() => {
  if (!props.modelValue) return ''
  return marked(props.modelValue)
})

// Insert markdown syntax at cursor position
const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = props.modelValue
  const selectedText = text.substring(start, end) || placeholder

  const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
  emit('update:modelValue', newText)

  // Restore cursor position
  nextTick(() => {
    textarea.focus()
    const cursorPos = start + before.length + selectedText.length
    textarea.setSelectionRange(cursorPos, cursorPos)
  })
}

// Insert image from picker
const insertImageFromPicker = () => {
  if (!selectedImageUrl.value) return
  // Insert markdown image syntax: ![alt](url)
  insertMarkdown(`![image](${selectedImageUrl.value})`, '', '')
  showImagePicker.value = false
  selectedImageUrl.value = null
}

// Toolbar actions
const toolbarActions = {
  bold: () => insertMarkdown('**', '**', 'bold text'),
  italic: () => insertMarkdown('*', '*', 'italic text'),
  strikethrough: () => insertMarkdown('~~', '~~', 'strikethrough'),
  h1: () => insertMarkdown('\n# ', '\n', 'Heading 1'),
  h2: () => insertMarkdown('\n## ', '\n', 'Heading 2'),
  h3: () => insertMarkdown('\n### ', '\n', 'Heading 3'),
  link: () => insertMarkdown('[', '](url)', 'link text'),
  image: () => showImagePicker.value = true,
  code: () => insertMarkdown('`', '`', 'code'),
  codeblock: () => insertMarkdown('\n```\n', '\n```\n', 'code here'),
  quote: () => insertMarkdown('\n> ', '\n', 'quote'),
  ul: () => insertMarkdown('\n- ', '\n', 'list item'),
  ol: () => insertMarkdown('\n1. ', '\n', 'list item'),
  hr: () => insertMarkdown('\n---\n', '', ''),
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault()
        toolbarActions.bold()
        break
      case 'i':
        event.preventDefault()
        toolbarActions.italic()
        break
      case 'k':
        event.preventDefault()
        toolbarActions.link()
        break
    }
  }
}
</script>

<template>
  <div :class="['markdown-editor', `markdown-editor--${viewMode}`]">
    <!-- Toolbar -->
    <div class="markdown-editor__toolbar">
      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Bold (Cmd+B)"
          @click="toolbarActions.bold"
        >
          <Icon name="lucide:bold" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Italic (Cmd+I)"
          @click="toolbarActions.italic"
        >
          <Icon name="lucide:italic" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Strikethrough"
          @click="toolbarActions.strikethrough"
        >
          <Icon name="lucide:strikethrough" />
        </button>
      </div>

      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Heading 1"
          @click="toolbarActions.h1"
        >
          <Icon name="lucide:heading-1" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Heading 2"
          @click="toolbarActions.h2"
        >
          <Icon name="lucide:heading-2" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Heading 3"
          @click="toolbarActions.h3"
        >
          <Icon name="lucide:heading-3" />
        </button>
      </div>

      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Link (Cmd+K)"
          @click="toolbarActions.link"
        >
          <Icon name="lucide:link" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Image"
          @click="toolbarActions.image"
        >
          <Icon name="lucide:image" />
        </button>
      </div>

      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Inline Code"
          @click="toolbarActions.code"
        >
          <Icon name="lucide:code" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Code Block"
          @click="toolbarActions.codeblock"
        >
          <Icon name="lucide:braces" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Quote"
          @click="toolbarActions.quote"
        >
          <Icon name="lucide:quote" />
        </button>
      </div>

      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Bullet List"
          @click="toolbarActions.ul"
        >
          <Icon name="lucide:list" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Numbered List"
          @click="toolbarActions.ol"
        >
          <Icon name="lucide:list-ordered" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          title="Horizontal Rule"
          @click="toolbarActions.hr"
        >
          <Icon name="lucide:minus" />
        </button>
      </div>

      <div class="markdown-editor__toolbar-spacer" />

      <!-- View Mode Toggle -->
      <div class="markdown-editor__toolbar-group">
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          :class="{ 'markdown-editor__toolbar-btn--active': viewMode === 'edit' }"
          title="Edit Only"
          @click="viewMode = 'edit'"
        >
          <Icon name="lucide:pen-line" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          :class="{ 'markdown-editor__toolbar-btn--active': viewMode === 'split' }"
          title="Split View"
          @click="viewMode = 'split'"
        >
          <Icon name="lucide:columns-2" />
        </button>
        <button
          type="button"
          class="markdown-editor__toolbar-btn"
          :class="{ 'markdown-editor__toolbar-btn--active': viewMode === 'preview' }"
          title="Preview Only"
          @click="viewMode = 'preview'"
        >
          <Icon name="lucide:eye" />
        </button>
      </div>
    </div>

    <!-- Editor Container -->
    <div class="markdown-editor__container">
      <!-- Textarea -->
      <div
        v-show="viewMode !== 'preview'"
        class="markdown-editor__input-wrapper"
        :class="{ 'markdown-editor__input-wrapper--full': viewMode === 'edit' }"
      >
        <textarea
          ref="textareaRef"
          :value="modelValue"
          :placeholder="placeholder || 'Write your content in Markdown...'"
          class="markdown-editor__textarea"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown="handleKeydown"
        />
      </div>

      <!-- Preview -->
      <div v-show="viewMode !== 'edit'" class="markdown-editor__preview-wrapper">
        <div class="markdown-editor__preview-header">Preview</div>
        <!-- eslint-disable-next-line vue/no-v-html, vue/html-self-closing -->
        <div class="markdown-editor__preview" v-html="renderedPreview"></div>
      </div>
    </div>

    <!-- Image Picker Modal -->
    <div v-if="showImagePicker" class="markdown-editor__modal-backdrop" @click.self="showImagePicker = false">
      <div class="markdown-editor__modal">
        <div class="markdown-editor__modal-header">
          <h3>Insert Image from Library</h3>
          <button class="markdown-editor__modal-close" @click="showImagePicker = false">
            <Icon name="lucide:x" />
          </button>
        </div>
        <div class="markdown-editor__modal-body">
          <ImagePicker v-model="selectedImageUrl" folder="general" accept="image/" />
        </div>
        <div class="markdown-editor__modal-footer">
          <button
            class="btn btn--ghost"
            @click="showImagePicker = false"
          >
            Cancel
          </button>
          <button
            class="btn btn--primary"
            :disabled="!selectedImageUrl"
            @click="insertImageFromPicker"
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.markdown-editor__modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.markdown-editor__modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.markdown-editor__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--admin-border, #e5e7eb);

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
}

.markdown-editor__modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: var(--admin-bg-hover, #f3f4f6);
  }

  svg {
    width: 20px;
    height: 20px;
  }
}

.markdown-editor__modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.markdown-editor__modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--admin-border, #e5e7eb);
  justify-content: flex-end;
}
</style>
