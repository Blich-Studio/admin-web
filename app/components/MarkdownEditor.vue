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

// Toolbar actions
const toolbarActions = {
  bold: () => insertMarkdown('**', '**', 'bold text'),
  italic: () => insertMarkdown('*', '*', 'italic text'),
  strikethrough: () => insertMarkdown('~~', '~~', 'strikethrough'),
  h1: () => insertMarkdown('\n# ', '\n', 'Heading 1'),
  h2: () => insertMarkdown('\n## ', '\n', 'Heading 2'),
  h3: () => insertMarkdown('\n### ', '\n', 'Heading 3'),
  link: () => insertMarkdown('[', '](url)', 'link text'),
  image: () => insertMarkdown('![', '](image-url)', 'alt text'),
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
  </div>
</template>
