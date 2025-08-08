import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface ScheduleItem {
  id: string;
  timeType: 'specific' | 'period';
  time: string; // Either HH:MM or 'Morning'|'Noon'|'Afternoon'|'Evening'
  title: string;
  description: string;
}

export interface ScheduleDay {
  description: string;
  items: ScheduleItem[];
}

export interface ScheduleBlockData extends BlockToolData {
  [key: string]: ScheduleDay; // "0", "1", "2", etc.
}

// Legacy format for backwards compatibility
export interface LegacyScheduleBlockData extends BlockToolData {
  date?: string;
  title?: string;
  items?: ScheduleItem[];
}

export interface ScheduleBlockConfig {
  titlePlaceholder?: string;
  timePlaceholder?: string;
  titleItemPlaceholder?: string;
  descriptionPlaceholder?: string;
}

interface ScheduleBlockConstructorArgs {
  data: ScheduleBlockData | LegacyScheduleBlockData | any;
  config?: ScheduleBlockConfig;
  api: API;
  readOnly: boolean;
}

export default class ScheduleBlock implements BlockTool {
  private api: API;
  private data: ScheduleBlockData;
  private readOnly: boolean;
  private config: ScheduleBlockConfig;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Workshop Schedule',
      icon: '<svg width="17" height="15" viewBox="0 0 17 15" fill="none"><path d="M13.5 2H15C15.5523 2 16 2.44772 16 3V13C16 13.5523 15.5523 14 15 14H1C0.447715 14 0 13.5523 0 13V3C0 2.44772 0.447715 2 1 2H2.5V1C2.5 0.447715 2.94772 0 3.5 0C4.05228 0 4.5 0.447715 4.5 1V2H11.5V1C11.5 0.447715 11.9477 0 12.5 0C13.0523 0 13.5 0.447715 13.5 1V2ZM14 6H2V12H14V6ZM4 8H6V10H4V8ZM8 8H10V10H8V8Z" fill="currentColor"/></svg>'
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private isLegacyFormat(data: any): data is LegacyScheduleBlockData {
    return data && (data.date !== undefined || data.title !== undefined || (data.items && Array.isArray(data.items)));
  }

  constructor({ data, config, api, readOnly }: ScheduleBlockConstructorArgs) {
    console.log('🏗️ ScheduleBlock - Constructor called with data:', data);
    
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    // Check if this is old format data and convert it
    if (this.isLegacyFormat(data)) {
      console.log('🏗️ ScheduleBlock - Converting legacy format');
      // Convert old single-day format to new multi-day format
      this.data = {
        "0": {
          description: data.title || '',
          items: (data.items || []).map((item: any) => ({
            ...item,
            timeType: item.timeType || 'specific'
          }))
        }
      };
    } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      console.log('🏗️ ScheduleBlock - Using existing format');
      // Already new format, use as-is
      this.data = data as ScheduleBlockData;
    } else {
      console.log('🏗️ ScheduleBlock - Creating empty schedule');
      // No data, initialize with empty day
      this.data = {
        "0": {
          description: '',
          items: [this._createEmptyItem()]
        }
      };
    }
    
    console.log('🏗️ ScheduleBlock - Final data:', this.data);
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['schedule-block']);
    
    // Days container
    const daysContainer = this._make('div', ['schedule-block__days']);
    
    // Render each day
    Object.keys(this.data).forEach((dayIndex) => {
      const dayData = this.data[dayIndex];
      const dayElement = this._createDayElement(dayIndex, dayData);
      daysContainer.appendChild(dayElement);
    });
    
    // Add day button and block actions
    if (!this.readOnly) {
      const addDayButton = this._make('button', ['schedule-block__add-day-btn'], {
        type: 'button'
      });
      addDayButton.innerHTML = '+ Add Day';
      addDayButton.style.cssText = 'margin: 1rem 0; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;';
      addDayButton.addEventListener('mouseover', () => addDayButton.style.background = '#2563eb');
      addDayButton.addEventListener('mouseout', () => addDayButton.style.background = '#3b82f6');
      addDayButton.addEventListener('click', () => {
        this._addDay(daysContainer);
      });
      
      // Block actions (export/import/duplicate)
      const blockActions = this._createBlockActions();
      
      wrapper.appendChild(addDayButton);
      wrapper.appendChild(blockActions);
    }
    
    wrapper.appendChild(daysContainer);
    
    return wrapper;
  }

  save(blockContent: HTMLElement): ScheduleBlockData {
    console.log('💾 ScheduleBlock - Save called with blockContent:', blockContent);
    
    const data: ScheduleBlockData = {};
    const dayElements = blockContent.querySelectorAll('.schedule-day');
    
    console.log('💾 ScheduleBlock - Found', dayElements.length, 'day elements');
    
    dayElements.forEach((dayElement, index) => {
      const dayIndex = (dayElement as HTMLElement).dataset.dayIndex!;
      console.log('💾 ScheduleBlock - Processing day', dayIndex);
      
      const descriptionElement = dayElement.querySelector('.schedule-day__description');
      const itemElements = dayElement.querySelectorAll('.schedule-item');
      
      console.log('💾 ScheduleBlock - Found', itemElements.length, 'items in day', dayIndex);
      
      const items: ScheduleItem[] = [];
      
      itemElements.forEach((itemElement, itemIndex) => {
        const timeTypeSelect = itemElement.querySelector('.schedule-item__time-type') as HTMLSelectElement;
        const timeInput = itemElement.querySelector('.schedule-item__time') as HTMLInputElement;
        const timePeriodSelect = itemElement.querySelector('.schedule-item__time-period') as HTMLSelectElement;
        const titleElement = itemElement.querySelector('.schedule-item__title');
        const descriptionElement = itemElement.querySelector('.schedule-item__description');
        
        if (titleElement) {
          const timeType = timeTypeSelect?.value as 'specific' | 'period' || 'specific';
          const timeValue = timeType === 'specific' 
            ? (timeInput?.value || '') 
            : (timePeriodSelect?.value || 'Morning');
            
          const item = {
            id: (itemElement as HTMLElement).dataset.itemId || this._generateId(),
            timeType,
            time: timeValue,
            title: titleElement.innerHTML || '',
            description: descriptionElement?.innerHTML || ''
          };
          
          console.log('💾 ScheduleBlock - Item', itemIndex, ':', item);
          items.push(item);
        }
      });
      
      data[dayIndex] = {
        description: descriptionElement?.innerHTML || '',
        items: items.length > 0 ? items : [this._createEmptyItem()]
      };
      
      console.log('💾 ScheduleBlock - Day', dayIndex, 'data:', data[dayIndex]);
    });
    
    // Ensure at least one day exists
    if (Object.keys(data).length === 0) {
      console.log('💾 ScheduleBlock - No days found, creating default day');
      data["0"] = {
        description: '',
        items: [this._createEmptyItem()]
      };
    }
    
    console.log('💾 ScheduleBlock - Final save data:', data);
    return data;
  }

  validate(data: ScheduleBlockData): boolean {
    // At least one day should have at least one item with a title
    return Object.values(data).some(day => 
      day.items.some(item => item.title.trim() !== '')
    );
  }

  private _createItemElement(item: ScheduleItem, index: number): HTMLElement {
    const itemWrapper = this._make('div', ['schedule-item']);
    itemWrapper.dataset.itemId = item.id;
    itemWrapper.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px; background: #f9fafb;';
    
    const itemHeader = this._make('div', ['schedule-item__header']);
    itemHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    
    // Time type selector
    const timeTypeSelect = this._make('select', ['schedule-item__time-type'], {
      disabled: this.readOnly
    });
    timeTypeSelect.style.cssText = 'padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;';
    
    const timeTypeOptions = [
      { value: 'specific', label: 'Time' },
      { value: 'period', label: 'Period' }
    ];
    
    timeTypeOptions.forEach(option => {
      const optionElement = this._make('option', null, { value: option.value });
      optionElement.textContent = option.label;
      optionElement.selected = option.value === (item.timeType || 'specific');
      timeTypeSelect.appendChild(optionElement);
    });
    
    // Time input (for specific times)
    const timeInput = this._make('input', ['schedule-item__time'], {
      type: 'time',
      value: item.timeType === 'specific' ? item.time : '',
      disabled: this.readOnly,
      style: `display: ${item.timeType === 'specific' ? 'block' : 'none'}; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;`
    });
    
    // Time period selector (for general periods)
    const timePeriodSelect = this._make('select', ['schedule-item__time-period'], {
      disabled: this.readOnly,
      style: `display: ${item.timeType === 'period' ? 'block' : 'none'}; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;`
    });
    
    const periodOptions = ['Morning', 'Noon', 'Afternoon', 'Evening'];
    periodOptions.forEach(period => {
      const optionElement = this._make('option', null, { value: period });
      optionElement.textContent = period;
      optionElement.selected = period === (item.timeType === 'period' ? item.time : 'Morning');
      timePeriodSelect.appendChild(optionElement);
    });
    
    // Title field
    const title = this._make('div', ['schedule-item__title'], {
      contentEditable: !this.readOnly,
      innerHTML: item.title
    });
    title.dataset.placeholder = this.config.titleItemPlaceholder || 'Activity title';
    title.style.cssText = 'flex: 1; min-height: 24px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white;';
    
    // Remove button
    if (!this.readOnly) {
      const removeButton = this._make('button', ['schedule-item__remove'], {
        type: 'button'
      });
      removeButton.innerHTML = '×';
      removeButton.style.cssText = 'background: #ef4444; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1;';
      removeButton.addEventListener('mouseover', () => removeButton.style.background = '#dc2626');
      removeButton.addEventListener('mouseout', () => removeButton.style.background = '#ef4444');
      removeButton.addEventListener('click', () => {
        this._removeItem(itemWrapper);
      });
      itemHeader.appendChild(removeButton);
    }
    
    // Toggle time input/period based on selection
    if (!this.readOnly) {
      timeTypeSelect.addEventListener('change', () => {
        const isSpecific = timeTypeSelect.value === 'specific';
        timeInput.style.display = isSpecific ? 'block' : 'none';
        timePeriodSelect.style.display = isSpecific ? 'none' : 'block';
      });
    }
    
    itemHeader.appendChild(timeTypeSelect);
    itemHeader.appendChild(timeInput);
    itemHeader.appendChild(timePeriodSelect);
    itemHeader.appendChild(title);
    
    // Description field
    const description = this._make('div', ['schedule-item__description'], {
      contentEditable: !this.readOnly,
      innerHTML: item.description
    });
    description.dataset.placeholder = this.config.descriptionPlaceholder || 'Optional description or notes';
    description.style.cssText = 'min-height: 20px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; background: white; margin-top: 8px;';
    
    itemWrapper.appendChild(itemHeader);
    itemWrapper.appendChild(description);
    
    return itemWrapper;
  }

  private _createDayElement(dayIndex: string, dayData: ScheduleDay): HTMLElement {
    const dayWrapper = this._make('div', ['schedule-day']);
    dayWrapper.dataset.dayIndex = dayIndex;
    dayWrapper.style.cssText = 'border: 2px solid #d1d5db; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: white;';
    
    // Day header
    const dayHeader = this._make('div', ['schedule-day__header']);
    dayHeader.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;';
    
    // Day title
    const dayTitle = this._make('h3', ['schedule-day__title']);
    dayTitle.textContent = `Day ${parseInt(dayIndex) + 1}`;
    dayTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;';
    
    // Remove day button (only show if more than one day exists)
    if (!this.readOnly && Object.keys(this.data).length > 1) {
      const removeDayButton = this._make('button', ['schedule-day__remove'], {
        type: 'button'
      });
      removeDayButton.innerHTML = '🗑️ Remove Day';
      removeDayButton.style.cssText = 'background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;';
      removeDayButton.addEventListener('mouseover', () => removeDayButton.style.background = '#dc2626');
      removeDayButton.addEventListener('mouseout', () => removeDayButton.style.background = '#ef4444');
      removeDayButton.addEventListener('click', () => {
        this._removeDay(dayWrapper);
      });
      dayHeader.appendChild(removeDayButton);
    }
    
    dayHeader.appendChild(dayTitle);
    
    // Day description
    const dayDescription = this._make('div', ['schedule-day__description'], {
      contentEditable: !this.readOnly,
      innerHTML: dayData.description
    });
    dayDescription.dataset.placeholder = 'Optional day description (e.g., "Workshop setup and introduction")';
    dayDescription.style.cssText = 'min-height: 20px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 12px; background: #f8fafc; font-style: italic; color: #6b7280;';
    
    // Items container for this day
    const itemsContainer = this._make('div', ['schedule-day__items']);
    
    // Render items for this day
    dayData.items.forEach((item, index) => {
      const itemElement = this._createItemElement(item, index);
      itemsContainer.appendChild(itemElement);
    });
    
    // Assemble the day structure first
    dayWrapper.appendChild(dayHeader);
    dayWrapper.appendChild(dayDescription);
    dayWrapper.appendChild(itemsContainer);
    
    // Add item button for this day (after all other content)
    if (!this.readOnly) {
      const addItemButton = this._make('button', ['schedule-day__add-item'], {
        type: 'button'
      });
      addItemButton.innerHTML = '+ Add Activity';
      addItemButton.style.cssText = 'background: #10b981; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; margin-top: 8px;';
      addItemButton.addEventListener('mouseover', () => addItemButton.style.background = '#059669');
      addItemButton.addEventListener('mouseout', () => addItemButton.style.background = '#10b981');
      addItemButton.addEventListener('click', () => {
        this._addItem(itemsContainer);
      });
      
      dayWrapper.appendChild(addItemButton);
    }
    
    return dayWrapper;
  }

  private _createBlockActions(): HTMLElement {
    const actionsContainer = this._make('div', ['schedule-block__actions']);
    actionsContainer.style.cssText = 'margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-start;';
    
    // Export button
    const exportBtn = this._make('button', ['block-button', 'block-button--secondary'], {
      type: 'button',
      title: 'Export schedule'
    });
    exportBtn.innerHTML = '📋 Export';
    exportBtn.style.cssText = 'background: #6b7280; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; font-size: 0.875rem; cursor: pointer; margin: 0;';
    exportBtn.addEventListener('mouseover', () => exportBtn.style.background = '#374151');
    exportBtn.addEventListener('mouseout', () => exportBtn.style.background = '#6b7280');
    exportBtn.addEventListener('click', () => this._exportBlock());
    
    // Import button  
    const importBtn = this._make('button', ['block-button', 'block-button--secondary'], {
      type: 'button',
      title: 'Import schedule'
    });
    importBtn.innerHTML = '📥 Import';
    importBtn.style.cssText = 'background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; font-size: 0.875rem; cursor: pointer; margin: 0;';
    importBtn.addEventListener('mouseover', () => importBtn.style.background = '#2563eb');
    importBtn.addEventListener('mouseout', () => importBtn.style.background = '#3b82f6');
    importBtn.addEventListener('click', () => this._importBlock());
    
    // Duplicate button
    const duplicateBtn = this._make('button', ['block-button', 'block-button--secondary'], {
      type: 'button',
      title: 'Duplicate this block'
    });
    duplicateBtn.innerHTML = '📄 Duplicate';
    duplicateBtn.style.cssText = 'background: #10b981; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; font-size: 0.875rem; cursor: pointer; margin: 0;';
    duplicateBtn.addEventListener('mouseover', () => duplicateBtn.style.background = '#059669');
    duplicateBtn.addEventListener('mouseout', () => duplicateBtn.style.background = '#10b981');
    duplicateBtn.addEventListener('click', () => this._duplicateBlock());
    
    actionsContainer.appendChild(exportBtn);
    actionsContainer.appendChild(importBtn);
    actionsContainer.appendChild(duplicateBtn);
    
    return actionsContainer;
  }

  private async _exportBlock(): Promise<void> {
    try {
      // Get current block data
      const blockElement = document.querySelector('.schedule-block');
      const blockData = this.save(blockElement as HTMLElement);
      
      // Create exportable format
      const exportData = {
        type: 'schedule',
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: blockData
      };
      
      // Show export modal instead of clipboard (iframe-safe)
      this._showExportModal(exportData);
      
    } catch (error) {
      console.error('Export failed:', error);
      this._showNotification('Export failed. Please try again.', 'error');
    }
  }

  private async _importBlock(): Promise<void> {
    try {
      // Use file input directly (iframe-safe)
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
        
        // Auto-cancel after 30 seconds
        setTimeout(() => reject(new Error('Import cancelled')), 30000);
      });
      
      document.body.appendChild(fileInput);
      fileInput.click();
      const importData = await filePromise;
      document.body.removeChild(fileInput);
      
      // Validate import data
      if (!importData || importData.type !== 'schedule') {
        throw new Error('Invalid schedule data');
      }
      
      // Handle legacy format conversion
      let convertedData = importData.data;
      if (this.isLegacyFormat(importData.data)) {
        // Convert old single-day format to new multi-day format
        const legacyData = importData.data as LegacyScheduleBlockData;
        convertedData = {
          "0": {
            description: legacyData.title || '',
            items: (legacyData.items || []).map((item: any) => ({
              ...item,
              timeType: item.timeType || 'specific'
            }))
          }
        };
      }
      
      // Apply imported data
      this.data = convertedData;
      
      // Re-render the block
      const blockElement = document.querySelector('.schedule-block');
      const newElement = this.render();
      blockElement?.replaceWith(newElement);
      
      this._showNotification('Schedule imported successfully!', 'success');
      
    } catch (error) {
      console.error('Import failed:', error);
      this._showNotification('Import failed. Please check your data.', 'error');
    }
  }

  private _duplicateBlock(): void {
    // Get current block data
    const blockElement = document.querySelector('.schedule-block');
    const blockData = this.save(blockElement as HTMLElement);
    
    // Insert new block after current one - use Editor.js API
    const currentIndex = this.api.blocks.getCurrentBlockIndex();
    this.api.blocks.insert('schedule', blockData, undefined, currentIndex + 1);
    
    this._showNotification('Block duplicated!', 'success');
  }

  private _showExportModal(exportData: any): void {
    // Create modal overlay
    const modal = this._make('div', ['export-modal']);
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
    
    // Create modal content
    const content = this._make('div', ['export-modal__content']);
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
    
    // Header
    const header = this._make('div', ['export-modal__header']);
    header.style.cssText = 'padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;';
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Export Schedule</h3>
      <button class="export-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
    `;
    
    // Body with JSON data
    const body = this._make('div', ['export-modal__body']);
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
    
    // Footer with actions
    const footer = this._make('div', ['export-modal__footer']);
    footer.style.cssText = 'padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;';
    
    const downloadBtn = this._make('button', ['download-btn']);
    downloadBtn.innerHTML = '📩 Download File';
    downloadBtn.style.cssText = 'background: #10b981; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;';
    downloadBtn.addEventListener('click', () => {
      this._downloadAsFile(exportData, `schedule-${Date.now()}.json`);
      this._showNotification('Schedule downloaded!', 'success');
    });
    
    const copyBtn = this._make('button', ['copy-btn']);
    copyBtn.innerHTML = '📋 Copy to Clipboard';
    copyBtn.style.cssText = 'background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; cursor: pointer;';
    copyBtn.addEventListener('click', async () => {
      const textarea = body.querySelector('textarea') as HTMLTextAreaElement;
      try {
        // Try modern clipboard API first
        await navigator.clipboard.writeText(textarea.value);
        this._showNotification('Copied to clipboard!', 'success');
      } catch (error) {
        // Fallback: select text for manual copy
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile
        
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
    
    // Assemble modal
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    
    // Event listeners
    const closeBtn = header.querySelector('.export-close') as HTMLElement;
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Add to page
    document.body.appendChild(modal);
    
    // Focus and select the textarea
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
    // Create notification element
    const notification = this._make('div', ['block-notification', `block-notification--${type}`]);
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    // Add CSS animations if not already present
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  private _addDay(daysContainer: HTMLElement): void {
    const newDayIndex = Object.keys(this.data).length.toString();
    const newDayData: ScheduleDay = {
      description: '',
      items: [this._createEmptyItem()]
    };
    
    const dayElement = this._createDayElement(newDayIndex, newDayData);
    daysContainer.appendChild(dayElement);
    
    // Focus on the new day's description
    const descriptionElement = dayElement.querySelector('.schedule-day__description') as HTMLElement;
    if (descriptionElement) {
      descriptionElement.focus();
    }
  }

  private _removeDay(dayElement: HTMLElement): void {
    const daysContainer = dayElement.parentElement;
    dayElement.remove();
    
    // Re-index remaining days to maintain sequential numbering
    if (daysContainer) {
      const remainingDays = daysContainer.querySelectorAll('.schedule-day');
      remainingDays.forEach((day, index) => {
        const dayEl = day as HTMLElement;
        dayEl.dataset.dayIndex = index.toString();
        const titleEl = dayEl.querySelector('.schedule-day__title');
        if (titleEl) {
          titleEl.textContent = `Day ${index + 1}`;
        }
      });
    }
    
    // Ensure at least one day remains
    if (daysContainer && daysContainer.children.length === 0) {
      this._addDay(daysContainer);
    }
  }

  private _addItem(container: HTMLElement): void {
    const newItem = this._createEmptyItem();
    const itemElement = this._createItemElement(newItem, container.children.length);
    container.appendChild(itemElement);
    
    // Focus on the new item's title
    const titleElement = itemElement.querySelector('.schedule-item__title') as HTMLElement;
    if (titleElement) {
      titleElement.focus();
    }
  }

  private _removeItem(itemElement: HTMLElement): void {
    const container = itemElement.parentElement;
    itemElement.remove();
    
    // Ensure at least one item remains in the day
    if (container && container.children.length === 0) {
      this._addItem(container);
    }
  }

  private _createEmptyItem(): ScheduleItem {
    return {
      id: this._generateId(),
      timeType: 'specific',
      time: '',
      title: '',
      description: ''
    };
  }

  private _generateId(): string {
    return 'schedule_item_' + Math.random().toString(36).substr(2, 9);
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

  static get sanitize() {
    return {
      // Allow any day index keys ("0", "1", "2", etc.)
      '*': {
        description: { b: true, i: true, strong: true, em: true },
        items: {
          id: false,
          timeType: false,
          time: false,
          title: { b: true, i: true, strong: true, em: true },
          description: { 
            b: true, i: true, strong: true, em: true, 
            p: true, br: true, a: { href: true } 
          }
        }
      }
    };
  }
}
