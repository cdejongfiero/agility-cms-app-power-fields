import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

/**
 * Individual FAQ item - compatible with FAQ primitive's FAQItem interface
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;           // HTML content from contentEditable
  answerMarkdown?: string;  // Optional markdown version
  tags?: string[];
}

/**
 * FAQ Block data structure
 * Designed to be directly consumable by FAQ/FAQSection primitives
 */
export interface FAQBlockData extends BlockToolData {
  title?: string;
  faqs: FAQItem[];
  displayStyle?: 'accordion' | 'list';
  showTags?: boolean;
  enableJsonLd?: boolean;
}

export interface FAQBlockConfig {
  titlePlaceholder?: string;
  questionPlaceholder?: string;
  answerPlaceholder?: string;
  tagsPlaceholder?: string;
  maxFAQs?: number;
}

interface FAQBlockConstructorArgs {
  data: FAQBlockData;
  config?: FAQBlockConfig;
  api: API;
  readOnly: boolean;
}

// ===================================================================
// FAQ BLOCK IMPLEMENTATION
// ===================================================================

export default class FAQBlock implements BlockTool {
  private api: API;
  private data: FAQBlockData;
  private readOnly: boolean;
  private config: FAQBlockConfig;
  private wrapper: HTMLElement | null = null;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'FAQ',
      icon: `<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get enableLineBreaks(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: FAQBlockConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    // Initialize data with defaults
    this.data = {
      title: data.title || '',
      faqs: data.faqs && data.faqs.length > 0 ? data.faqs : [
        this._createEmptyFAQ()
      ],
      displayStyle: data.displayStyle || 'accordion',
      showTags: data.showTags ?? true,
      enableJsonLd: data.enableJsonLd ?? true
    };
  }

  render(): HTMLElement {
    this.wrapper = this._make('div', ['faq-block']);
    
    // Header section
    const header = this._createHeader();
    this.wrapper.appendChild(header);
    
    // FAQs container
    const faqsContainer = this._make('div', ['faq-block__faqs']);
    
    // Render all FAQ items
    this.data.faqs.forEach((faq, index) => {
      const faqElement = this._createFAQElement(faq, index);
      faqsContainer.appendChild(faqElement);
    });
    
    this.wrapper.appendChild(faqsContainer);
    
    // Add FAQ button
    if (!this.readOnly) {
      const addButton = this._make('button', ['faq-block__add-faq'], {
        type: 'button'
      });
      addButton.innerHTML = '+ Add FAQ';
      addButton.addEventListener('click', () => this._addFAQ(faqsContainer));
      this.wrapper.appendChild(addButton);
      
      // Block actions (export/import)
      const actionsContainer = this._createBlockActions();
      this.wrapper.appendChild(actionsContainer);
    }
    
    // Schema.org hint
    const schemaHint = this._createSchemaHint();
    this.wrapper.appendChild(schemaHint);
    
    return this.wrapper;
  }

  save(blockContent: HTMLElement): FAQBlockData {
    const titleElement = blockContent.querySelector('.faq-block__title');
    const displayStyleSelect = blockContent.querySelector('.faq-block__display-style') as HTMLSelectElement;
    const showTagsCheckbox = blockContent.querySelector('.faq-block__show-tags') as HTMLInputElement;
    const enableJsonLdCheckbox = blockContent.querySelector('.faq-block__enable-jsonld') as HTMLInputElement;
    const faqElements = blockContent.querySelectorAll('.faq-block__faq-item');
    
    const faqs: FAQItem[] = [];
    
    faqElements.forEach(faqEl => {
      const questionEl = faqEl.querySelector('.faq-block__question');
      const answerEl = faqEl.querySelector('.faq-block__answer');
      const tagsEl = faqEl.querySelector('.faq-block__tags') as HTMLInputElement;
      const faqId = (faqEl as HTMLElement).dataset.faqId || this._generateId();
      
      const question = questionEl?.innerHTML?.trim() || '';
      const answer = answerEl?.innerHTML?.trim() || '';
      
      // Only save FAQs with at least a question
      if (question) {
        // Parse tags from comma-separated input
        const tagsValue = tagsEl?.value?.trim() || '';
        const tags = tagsValue
          ? tagsValue.split(',').map(t => t.trim()).filter(Boolean)
          : undefined;
        
        faqs.push({
          id: faqId,
          question,
          answer,
          tags: tags && tags.length > 0 ? tags : undefined
        });
      }
    });
    
    return {
      title: titleElement?.innerHTML?.trim() || '',
      faqs: faqs.length > 0 ? faqs : [this._createEmptyFAQ()],
      displayStyle: (displayStyleSelect?.value as 'accordion' | 'list') || 'accordion',
      showTags: showTagsCheckbox?.checked ?? true,
      enableJsonLd: enableJsonLdCheckbox?.checked ?? true
    };
  }

  validate(data: FAQBlockData): boolean {
    // Must have at least one FAQ with a question
    return data.faqs.some(faq => faq.question.trim() !== '');
  }

  // ===================================================================
  // PRIVATE METHODS - UI CREATION
  // ===================================================================

  private _createHeader(): HTMLElement {
    const header = this._make('div', ['faq-block__header']);
    
    // Title input
    const titleContainer = this._make('div', ['faq-block__title-container']);
    
    const titleLabel = this._make('label', ['faq-block__label']);
    titleLabel.textContent = 'Section Title (optional)';
    
    const title = this._make('div', ['faq-block__title'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: this.data.title || ''
    });
    title.dataset.placeholder = this.config.titlePlaceholder || 'Frequently Asked Questions';
    
    titleContainer.appendChild(titleLabel);
    titleContainer.appendChild(title);
    
    // Options row
    const optionsRow = this._make('div', ['faq-block__options']);
    
    // Display style selector
    const displayStyleContainer = this._make('div', ['faq-block__option']);
    const displayStyleLabel = this._make('label', ['faq-block__option-label']);
    displayStyleLabel.textContent = 'Display:';
    
    const displayStyleSelect = this._make('select', ['faq-block__display-style'], {
      disabled: this.readOnly
    }) as HTMLSelectElement;
    
    const displayOptions = [
      { value: 'accordion', label: 'Accordion' },
      { value: 'list', label: 'List' }
    ];
    
    displayOptions.forEach(option => {
      const optionEl = this._make('option', null, { value: option.value });
      optionEl.textContent = option.label;
      optionEl.selected = option.value === this.data.displayStyle;
      displayStyleSelect.appendChild(optionEl);
    });
    
    displayStyleContainer.appendChild(displayStyleLabel);
    displayStyleContainer.appendChild(displayStyleSelect);
    
    // Show tags checkbox
    const showTagsContainer = this._make('div', ['faq-block__option']);
    const showTagsLabel = this._make('label', ['faq-block__checkbox-label']);
    
    const showTagsCheckbox = this._make('input', ['faq-block__show-tags'], {
      type: 'checkbox',
      checked: this.data.showTags,
      disabled: this.readOnly
    }) as HTMLInputElement;
    
    const showTagsText = this._make('span');
    showTagsText.textContent = 'Show Tags';
    
    showTagsLabel.appendChild(showTagsCheckbox);
    showTagsLabel.appendChild(showTagsText);
    showTagsContainer.appendChild(showTagsLabel);
    
    // Enable JSON-LD checkbox
    const jsonLdContainer = this._make('div', ['faq-block__option']);
    const jsonLdLabel = this._make('label', ['faq-block__checkbox-label']);
    
    const jsonLdCheckbox = this._make('input', ['faq-block__enable-jsonld'], {
      type: 'checkbox',
      checked: this.data.enableJsonLd,
      disabled: this.readOnly
    }) as HTMLInputElement;
    
    const jsonLdText = this._make('span');
    jsonLdText.textContent = 'SEO Schema';
    
    jsonLdLabel.appendChild(jsonLdCheckbox);
    jsonLdLabel.appendChild(jsonLdText);
    jsonLdContainer.appendChild(jsonLdLabel);
    
    optionsRow.appendChild(displayStyleContainer);
    optionsRow.appendChild(showTagsContainer);
    optionsRow.appendChild(jsonLdContainer);
    
    header.appendChild(titleContainer);
    header.appendChild(optionsRow);
    
    return header;
  }

  private _createFAQElement(faq: FAQItem, index: number): HTMLElement {
    const faqWrapper = this._make('div', ['faq-block__faq-item']);
    faqWrapper.dataset.faqId = faq.id;
    
    // FAQ header with collapse toggle and delete
    const faqHeader = this._make('div', ['faq-block__faq-header']);
    
    // Collapse toggle
    const collapseToggle = this._make('button', ['faq-block__collapse-toggle'], {
      type: 'button',
      title: 'Collapse/Expand'
    });
    collapseToggle.innerHTML = '▼';
    collapseToggle.addEventListener('click', () => {
      const isCollapsed = faqWrapper.classList.toggle('faq-block__faq-item--collapsed');
      collapseToggle.innerHTML = isCollapsed ? '▶' : '▼';
    });
    
    // FAQ number badge
    const numberBadge = this._make('span', ['faq-block__faq-number']);
    numberBadge.textContent = `Q${index + 1}`;
    
    // Question preview (shown when collapsed)
    const questionPreview = this._make('span', ['faq-block__question-preview']);
    questionPreview.textContent = faq.question 
      ? (faq.question.length > 50 ? faq.question.substring(0, 50) + '...' : faq.question)
      : 'New Question...';
    
    // Delete button
    if (!this.readOnly) {
      const deleteButton = this._make('button', ['faq-block__delete-faq'], {
        type: 'button',
        title: 'Delete FAQ'
      });
      deleteButton.innerHTML = '×';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteFAQ(faqWrapper);
      });
      faqHeader.appendChild(deleteButton);
    }
    
    faqHeader.appendChild(collapseToggle);
    faqHeader.appendChild(numberBadge);
    faqHeader.appendChild(questionPreview);
    
    // FAQ body (collapsible content)
    const faqBody = this._make('div', ['faq-block__faq-body']);
    
    // Question field
    const questionContainer = this._make('div', ['faq-block__field-container']);
    const questionLabel = this._make('label', ['faq-block__field-label']);
    questionLabel.textContent = 'Question';
    
    const question = this._make('div', ['faq-block__question'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: faq.question
    });
    question.dataset.placeholder = this.config.questionPlaceholder || 'Enter your question here...';
    
    // Update preview on question change
    question.addEventListener('input', () => {
      const text = question.textContent || '';
      questionPreview.textContent = text 
        ? (text.length > 50 ? text.substring(0, 50) + '...' : text)
        : 'New Question...';
    });
    
    questionContainer.appendChild(questionLabel);
    questionContainer.appendChild(question);
    
    // Answer field
    const answerContainer = this._make('div', ['faq-block__field-container']);
    const answerLabel = this._make('label', ['faq-block__field-label']);
    answerLabel.textContent = 'Answer';
    
    const answer = this._make('div', ['faq-block__answer'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: faq.answer
    });
    answer.dataset.placeholder = this.config.answerPlaceholder || 'Enter your answer here... (supports basic formatting)';
    
    answerContainer.appendChild(answerLabel);
    answerContainer.appendChild(answer);
    
    // Tags field
    const tagsContainer = this._make('div', ['faq-block__field-container', 'faq-block__tags-container']);
    const tagsLabel = this._make('label', ['faq-block__field-label']);
    tagsLabel.textContent = 'Tags (comma-separated, optional)';
    
    const tags = this._make('input', ['faq-block__tags'], {
      type: 'text',
      value: faq.tags?.join(', ') || '',
      placeholder: this.config.tagsPlaceholder || 'e.g., Shipping, Returns, Warranty',
      disabled: this.readOnly
    }) as HTMLInputElement;
    
    tagsContainer.appendChild(tagsLabel);
    tagsContainer.appendChild(tags);
    
    faqBody.appendChild(questionContainer);
    faqBody.appendChild(answerContainer);
    faqBody.appendChild(tagsContainer);
    
    faqWrapper.appendChild(faqHeader);
    faqWrapper.appendChild(faqBody);
    
    return faqWrapper;
  }

  private _createBlockActions(): HTMLElement {
    const actionsContainer = this._make('div', ['faq-block__actions']);
    
    // Export button
    const exportBtn = this._make('button', ['faq-block__action-btn', 'faq-block__action-btn--export'], {
      type: 'button',
      title: 'Export FAQs'
    });
    exportBtn.innerHTML = '📋 Export';
    exportBtn.addEventListener('click', () => this._exportBlock());
    
    // Import button
    const importBtn = this._make('button', ['faq-block__action-btn', 'faq-block__action-btn--import'], {
      type: 'button',
      title: 'Import FAQs'
    });
    importBtn.innerHTML = '📥 Import';
    importBtn.addEventListener('click', () => this._importBlock());
    
    // Duplicate button
    const duplicateBtn = this._make('button', ['faq-block__action-btn', 'faq-block__action-btn--duplicate'], {
      type: 'button',
      title: 'Duplicate this block'
    });
    duplicateBtn.innerHTML = '📄 Duplicate';
    duplicateBtn.addEventListener('click', () => this._duplicateBlock());
    
    actionsContainer.appendChild(exportBtn);
    actionsContainer.appendChild(importBtn);
    actionsContainer.appendChild(duplicateBtn);
    
    return actionsContainer;
  }

  private _createSchemaHint(): HTMLElement {
    const hint = this._make('div', ['faq-block__schema-hint']);
    hint.innerHTML = `
      <span class="faq-block__schema-icon">💡</span>
      <span class="faq-block__schema-text">
        When "SEO Schema" is enabled, this FAQ will output <strong>JSON-LD structured data</strong> 
        for search engines and AI crawlers (Google rich snippets, ChatGPT, Claude, etc.)
      </span>
    `;
    return hint;
  }

  // ===================================================================
  // PRIVATE METHODS - ACTIONS
  // ===================================================================

  private _addFAQ(container: HTMLElement): void {
    const maxFAQs = this.config.maxFAQs || 50;
    const currentFAQs = container.querySelectorAll('.faq-block__faq-item').length;
    
    if (currentFAQs >= maxFAQs) {
      this._showNotification(`Maximum of ${maxFAQs} FAQs allowed`, 'error');
      return;
    }
    
    const newFAQ = this._createEmptyFAQ();
    const faqElement = this._createFAQElement(newFAQ, currentFAQs);
    container.appendChild(faqElement);
    
    this._updateFAQNumbers();
    
    // Focus the new question field
    const questionField = faqElement.querySelector('.faq-block__question') as HTMLElement;
    questionField?.focus();
  }

  private _deleteFAQ(faqElement: HTMLElement): void {
    const container = faqElement.parentElement;
    const allFAQs = container?.querySelectorAll('.faq-block__faq-item');
    
    // Don't delete if it's the last FAQ
    if (allFAQs && allFAQs.length <= 1) {
      this._showNotification('At least one FAQ is required', 'error');
      return;
    }
    
    faqElement.remove();
    this._updateFAQNumbers();
  }

  private _updateFAQNumbers(): void {
    if (!this.wrapper) return;
    
    const faqItems = this.wrapper.querySelectorAll('.faq-block__faq-item');
    faqItems.forEach((item, index) => {
      const numberBadge = item.querySelector('.faq-block__faq-number');
      if (numberBadge) {
        numberBadge.textContent = `Q${index + 1}`;
      }
    });
  }

  private async _exportBlock(): Promise<void> {
    try {
      if (!this.wrapper) return;
      
      const blockData = this.save(this.wrapper);
      
      const exportData = {
        type: 'faq',
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: blockData
      };
      
      this._showExportModal(exportData);
      
    } catch (error) {
      console.error('Export failed:', error);
      this._showNotification('Export failed. Please try again.', 'error');
    }
  }

  private async _importBlock(): Promise<void> {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      
      const filePromise = new Promise<any>((resolve, reject) => {
        fileInput.addEventListener('change', async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const text = await file.text();
              resolve(JSON.parse(text));
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error('No file selected'));
          }
        });
        
        setTimeout(() => reject(new Error('Import cancelled')), 30000);
      });
      
      document.body.appendChild(fileInput);
      fileInput.click();
      const importData = await filePromise;
      document.body.removeChild(fileInput);
      
      // Validate import data
      if (!importData || importData.type !== 'faq') {
        throw new Error('Invalid FAQ data');
      }
      
      // Apply imported data
      this.data = importData.data;
      
      // Re-render the block
      if (this.wrapper) {
        const newElement = this.render();
        this.wrapper.replaceWith(newElement);
        this.wrapper = newElement;
      }
      
      this._showNotification('FAQs imported successfully!', 'success');
      
    } catch (error) {
      console.error('Import failed:', error);
      this._showNotification('Import failed. Please check your file.', 'error');
    }
  }

  private _duplicateBlock(): void {
    if (!this.wrapper) return;
    
    const blockData = this.save(this.wrapper);
    
    // Generate new IDs for all FAQs
    const duplicatedData = {
      ...blockData,
      faqs: blockData.faqs.map(faq => ({
        ...faq,
        id: this._generateId()
      }))
    };
    
    const currentIndex = this.api.blocks.getCurrentBlockIndex();
    this.api.blocks.insert('faq', duplicatedData, undefined, currentIndex + 1);
    
    this._showNotification('FAQ block duplicated!', 'success');
  }

  private _showExportModal(exportData: any): void {
    const modal = this._make('div', ['faq-export-modal']);
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    
    const content = this._make('div', ['faq-export-modal__content']);
    content.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    const header = this._make('div', ['faq-export-modal__header']);
    header.style.cssText = 'padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;';
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Export FAQs</h3>
      <button class="faq-export-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
    `;
    
    const body = this._make('div', ['faq-export-modal__body']);
    body.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px;';
    
    const jsonText = JSON.stringify(exportData, null, 2);
    body.innerHTML = `
      <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Copy the JSON below or download as file:</p>
      <textarea readonly style="
        width: 100%;
        height: 300px;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        background: #f8fafc;
        resize: vertical;
      ">${jsonText}</textarea>
    `;
    
    const footer = this._make('div', ['faq-export-modal__footer']);
    footer.style.cssText = 'padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;';
    
    const downloadBtn = this._make('button', ['faq-download-btn']);
    downloadBtn.innerHTML = '📩 Download File';
    downloadBtn.style.cssText = 'background: #10b981; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;';
    downloadBtn.addEventListener('click', () => {
      this._downloadAsFile(exportData, `faqs-${Date.now()}.json`);
      this._showNotification('FAQs downloaded!', 'success');
    });
    
    const copyBtn = this._make('button', ['faq-copy-btn']);
    copyBtn.innerHTML = '📋 Copy to Clipboard';
    copyBtn.style.cssText = 'background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;';
    copyBtn.addEventListener('click', async () => {
      const textarea = body.querySelector('textarea') as HTMLTextAreaElement;
      try {
        await navigator.clipboard.writeText(textarea.value);
        this._showNotification('Copied to clipboard!', 'success');
      } catch (error) {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        try {
          document.execCommand('copy');
          this._showNotification('Selected for copying (Ctrl+C)', 'info');
        } catch (execError) {
          this._showNotification('Please manually copy the selected text', 'info');
        }
      }
    });
    
    footer.appendChild(downloadBtn);
    footer.appendChild(copyBtn);
    
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    
    const closeBtn = header.querySelector('.faq-export-close') as HTMLElement;
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.body.appendChild(modal);
    
    const textarea = body.querySelector('textarea') as HTMLTextAreaElement;
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 100);
  }

  private _downloadAsFile(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  private _showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = this._make('div', ['faq-notification', `faq-notification--${type}`]);
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      animation: faqSlideIn 0.3s ease-out;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    if (!document.getElementById('faq-notification-animations')) {
      const style = document.createElement('style');
      style.id = 'faq-notification-animations';
      style.textContent = `
        @keyframes faqSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes faqSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'faqSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // ===================================================================
  // PRIVATE METHODS - UTILITIES
  // ===================================================================

  private _createEmptyFAQ(): FAQItem {
    return {
      id: this._generateId(),
      question: '',
      answer: '',
      tags: undefined
    };
  }

  private _generateId(): string {
    return 'faq_' + Math.random().toString(36).substr(2, 9);
  }

  private _make<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    classNames: string | string[] | null = null,
    attributes: { [key: string]: any } = {}
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      (el as any)[attrName] = attributes[attrName];
    }

    return el;
  }

  // ===================================================================
  // SANITIZATION RULES
  // ===================================================================

  static get sanitize() {
    return {
      title: { 
        b: true, 
        i: true, 
        strong: true, 
        em: true 
      },
      faqs: {
        id: false,
        question: { 
          b: true, 
          i: true, 
          strong: true, 
          em: true 
        },
        answer: { 
          p: true, 
          br: true, 
          strong: true, 
          em: true, 
          b: true,
          i: true,
          u: true,
          a: { href: true, target: '_blank' },
          ul: true,
          ol: true,
          li: true
        },
        answerMarkdown: false,
        tags: false
      },
      displayStyle: false,
      showTags: false,
      enableJsonLd: false
    };
  }
}
