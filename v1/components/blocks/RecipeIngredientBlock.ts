import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface RecipeIngredient {
  id: string;
  quantity: number | string; // Support both for backward compatibility
  unit: string;
  ingredient: string;
  notes: string;
}

export interface RecipeIngredientData extends BlockToolData {
  title: string;
  ingredients: RecipeIngredient[];
  servings: number | string; // Support both for backward compatibility
}

export interface RecipeIngredientConfig {
  titlePlaceholder?: string;
  maxIngredients?: number;
}

interface RecipeIngredientConstructorArgs {
  data: RecipeIngredientData;
  config?: RecipeIngredientConfig;
  api: API;
  readOnly: boolean;
}

// Comprehensive cooking units list optimized for recipe parser compatibility
// Using plural forms only - frontend will handle singular/plural display based on quantity
const COOKING_UNITS = [
  // Volume - US/Imperial
  { value: 'cups', label: 'cups', category: 'volume' },
  { value: 'tablespoons', label: 'tablespoons', category: 'volume' },
  { value: 'tbsp', label: 'tbsp', category: 'volume' },
  { value: 'teaspoons', label: 'teaspoons', category: 'volume' },
  { value: 'tsp', label: 'tsp', category: 'volume' },
  { value: 'fluid ounces', label: 'fluid ounces', category: 'volume' },
  { value: 'fl oz', label: 'fl oz', category: 'volume' },
  { value: 'pints', label: 'pints', category: 'volume' },
  { value: 'quarts', label: 'quarts', category: 'volume' },
  { value: 'gallons', label: 'gallons', category: 'volume' },
  
  // Volume - Metric
  { value: 'liters', label: 'liters', category: 'volume' },
  { value: 'l', label: 'l', category: 'volume' },
  { value: 'milliliters', label: 'milliliters', category: 'volume' },
  { value: 'ml', label: 'ml', category: 'volume' },
  
  // Weight - US/Imperial
  { value: 'pounds', label: 'pounds', category: 'weight' },
  { value: 'lbs', label: 'lbs', category: 'weight' },
  { value: 'ounces', label: 'ounces', category: 'weight' },
  { value: 'oz', label: 'oz', category: 'weight' },
  
  // Weight - Metric
  { value: 'grams', label: 'grams', category: 'weight' },
  { value: 'g', label: 'g', category: 'weight' },
  { value: 'kilograms', label: 'kilograms', category: 'weight' },
  { value: 'kg', label: 'kg', category: 'weight' },
  { value: 'milligrams', label: 'milligrams', category: 'weight' },
  { value: 'mg', label: 'mg', category: 'weight' },
  
  // Count/Pieces
  { value: 'pieces', label: 'pieces', category: 'count' },
  { value: 'whole', label: 'whole', category: 'count' },
  { value: 'slices', label: 'slices', category: 'count' },
  { value: 'cloves', label: 'cloves', category: 'count' },
  { value: 'heads', label: 'heads', category: 'count' },
  { value: 'bunches', label: 'bunches', category: 'count' },
  { value: 'packages', label: 'packages', category: 'count' },
  { value: 'cans', label: 'cans', category: 'count' },
  { value: 'jars', label: 'jars', category: 'count' },
  { value: 'bottles', label: 'bottles', category: 'count' },
  { value: 'bags', label: 'bags', category: 'count' },
  { value: 'boxes', label: 'boxes', category: 'count' },
  
  // Small amounts
  { value: 'pinches', label: 'pinches', category: 'small' },
  { value: 'dashes', label: 'dashes', category: 'small' },
  { value: 'splashes', label: 'splashes', category: 'small' },
  { value: 'drops', label: 'drops', category: 'small' },
  
  // No unit
  { value: '', label: '(no unit)', category: 'none' }
];

export default class RecipeIngredientBlock implements BlockTool {
  private api: API;
  private data: RecipeIngredientData;
  private readOnly: boolean;
  private config: RecipeIngredientConfig;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Recipe Ingredients',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <path d="M2 2h13v11H2V2zM2 6h13M5 2v11M9 2v11" stroke="currentColor" stroke-width="1"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get enableLineBreaks(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: RecipeIngredientConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    // Initialize data with defaults
    this.data = {
      title: data.title || 'Ingredients',
      servings: data.servings || 4,
      ingredients: data.ingredients && data.ingredients.length > 0 ? data.ingredients : [
        { id: this._generateId(), quantity: '', unit: '', ingredient: '', notes: '' }
      ]
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['recipe-ingredient-block']);
    
    // Create header
    const header = this._make('div', ['recipe-ingredient-block__header']);
    
    const title = this._make('div', ['recipe-ingredient-block__title'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: this.data.title
    });
    title.dataset.placeholder = this.config.titlePlaceholder || 'Ingredients';
    
    const servingsContainer = this._make('div', ['recipe-ingredient-block__servings-container']);
    const servingsLabel = this._make('span', ['recipe-ingredient-block__servings-label']);
    servingsLabel.textContent = 'Servings:';
    
    // Number input for servings
    const servings = this._make('input', ['recipe-ingredient-block__servings'], {
      type: 'number',
      min: '1',
      max: '999',
      step: '1',
      value: this.data.servings.toString(),
      disabled: this.readOnly,
      placeholder: '4'
    });
    
    servingsContainer.appendChild(servingsLabel);
    servingsContainer.appendChild(servings);
    
    header.appendChild(title);
    header.appendChild(servingsContainer);
    
    // Create table
    const table = this._make('div', ['recipe-ingredient-block__table']);
    
    // Table header
    const tableHeader = this._make('div', ['recipe-ingredient-block__table-header']);
    const headers = ['Quantity', 'Unit', 'Ingredient', 'Notes', ''];
    headers.forEach(headerText => {
      const headerCell = this._make('div', ['recipe-ingredient-block__header-cell']);
      headerCell.textContent = headerText;
      tableHeader.appendChild(headerCell);
    });
    table.appendChild(tableHeader);
    
    // Table body
    const tableBody = this._make('div', ['recipe-ingredient-block__table-body']);
    
    // Render all ingredients
    this.data.ingredients.forEach(ingredient => {
      const row = this._createIngredientRow(ingredient);
      tableBody.appendChild(row);
    });
    
    table.appendChild(tableBody);
    
    // Add ingredient button
    if (!this.readOnly) {
      const addButton = this._make('button', ['recipe-ingredient-block__add-ingredient'], {
        type: 'button'
      });
      addButton.innerHTML = '+ Add Ingredient';
      table.appendChild(addButton);
    }
    
    wrapper.appendChild(header);
    wrapper.appendChild(table);
    
    // Attach event listeners
    if (!this.readOnly) {
      this._attachEventListeners(wrapper);
    }
    
    return wrapper;
  }

  save(blockContent: HTMLElement): RecipeIngredientData {
    const title = blockContent.querySelector('.recipe-ingredient-block__title');
    const servings = blockContent.querySelector('.recipe-ingredient-block__servings') as HTMLInputElement;
    const ingredientRows = blockContent.querySelectorAll('.recipe-ingredient-block__ingredient-row');
    
    const ingredients: RecipeIngredient[] = [];
    ingredientRows.forEach(row => {
      const quantity = row.querySelector('.recipe-ingredient-block__quantity') as HTMLInputElement;
      const unit = row.querySelector('.recipe-ingredient-block__unit') as HTMLSelectElement;
      const ingredient = row.querySelector('.recipe-ingredient-block__ingredient') as HTMLInputElement;
      const notes = row.querySelector('.recipe-ingredient-block__notes') as HTMLInputElement;
      const ingredientId = row.getAttribute('data-ingredient-id') || this._generateId();
      
      // Include if at least ingredient name is provided
      if (ingredient?.value.trim()) {
        ingredients.push({
          id: ingredientId,
          quantity: this._parseQuantity(quantity?.value || ''),
          unit: unit?.value || '',
          ingredient: ingredient.value.trim(),
          notes: notes?.value.trim() || ''
        });
      }
    });
    
    return {
      title: title?.innerHTML ?? 'Ingredients',
      servings: parseInt(servings?.value || '4', 10),
      ingredients: ingredients.length > 0 ? ingredients : [
        { id: this._generateId(), quantity: '', unit: '', ingredient: '', notes: '' }
      ]
    };
  }

  validate(data: RecipeIngredientData): boolean {
    // Must have at least one ingredient with a name
    return data.ingredients.some(ingredient => ingredient.ingredient.trim() !== '');
  }

  private _createIngredientRow(ingredient: RecipeIngredient): HTMLElement {
    const row = this._make('div', ['recipe-ingredient-block__ingredient-row']);
    row.setAttribute('data-ingredient-id', ingredient.id);
    
    // Quantity cell - Number input that supports decimals and fractions
    const quantityCell = this._make('div', ['recipe-ingredient-block__cell']);
    const quantity = this._make('input', ['recipe-ingredient-block__quantity'], {
      type: 'text', // Use text to allow fractions like "1/2" or "1 1/4"
      value: ingredient.quantity.toString(),
      placeholder: '1',
      disabled: this.readOnly,
      pattern: '^[0-9]*[.]?[0-9]*[/]?[0-9]*$' // Allow decimals and fractions
    });
    quantityCell.appendChild(quantity);
    
    // Unit cell - Dropdown select
    const unitCell = this._make('div', ['recipe-ingredient-block__cell']);
    const unit = this._make('select', ['recipe-ingredient-block__unit'], {
      disabled: this.readOnly
    });
    
    // Add all cooking units grouped by category
    const categories: { [key: string]: string } = {
      'volume': 'Volume',
      'weight': 'Weight', 
      'count': 'Count/Pieces',
      'small': 'Small Amounts',
      'none': 'Other'
    };
    
    Object.entries(categories).forEach(([categoryKey, categoryLabel]) => {
      const optgroup = this._make('optgroup', [], { label: categoryLabel });
      
      COOKING_UNITS
        .filter(u => u.category === categoryKey)
        .forEach(unitOption => {
          const option = this._make('option', [], { 
            value: unitOption.value 
          });
          option.textContent = unitOption.label;
          if (unitOption.value === ingredient.unit) {
            option.selected = true;
          }
          optgroup.appendChild(option);
        });
      
      unit.appendChild(optgroup);
    });
    
    unitCell.appendChild(unit);
    
    // Ingredient cell - Simple text input
    const ingredientCell = this._make('div', ['recipe-ingredient-block__cell']);
    const ingredientInput = this._make('input', ['recipe-ingredient-block__ingredient'], {
      type: 'text',
      value: ingredient.ingredient,
      placeholder: 'flour',
      disabled: this.readOnly
    });
    
    ingredientCell.appendChild(ingredientInput);
    
    // Notes cell - Text input
    const notesCell = this._make('div', ['recipe-ingredient-block__cell']);
    const notes = this._make('input', ['recipe-ingredient-block__notes'], {
      type: 'text',
      value: ingredient.notes,
      placeholder: 'optional notes',
      disabled: this.readOnly
    });
    notesCell.appendChild(notes);
    
    // Actions cell
    const actionsCell = this._make('div', ['recipe-ingredient-block__cell', 'recipe-ingredient-block__actions-cell']);
    
    if (!this.readOnly) {
      const deleteButton = this._make('button', ['recipe-ingredient-block__delete-ingredient'], {
        type: 'button',
        title: 'Delete ingredient'
      });
      deleteButton.innerHTML = '×';
      actionsCell.appendChild(deleteButton);
    }
    
    row.appendChild(quantityCell);
    row.appendChild(unitCell);
    row.appendChild(ingredientCell);
    row.appendChild(notesCell);
    row.appendChild(actionsCell);
    
    return row;
  }

  private _parseQuantity(value: string): number | string {
    if (!value) return '';
    
    // Try to parse as number first
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue;
    }
    
    // If not a number, return as string (for fractions like "1/2", "1 1/4")
    return value;
  }

  private _attachEventListeners(wrapper: HTMLElement): void {
    const addButton = wrapper.querySelector('.recipe-ingredient-block__add-ingredient');
    const tableBody = wrapper.querySelector('.recipe-ingredient-block__table-body');
    
    // Add new ingredient
    addButton?.addEventListener('click', () => {
      const maxIngredients = this.config.maxIngredients || 50;
      const currentIngredients = wrapper.querySelectorAll('.recipe-ingredient-block__ingredient-row').length;
      
      if (currentIngredients < maxIngredients) {
        const newIngredient = { 
          id: this._generateId(), 
          quantity: '', 
          unit: '', 
          ingredient: '', 
          notes: '' 
        };
        const row = this._createIngredientRow(newIngredient);
        tableBody?.appendChild(row);
        
        // Focus the quantity field first
        const quantityField = row.querySelector('.recipe-ingredient-block__quantity') as HTMLElement;
        quantityField?.focus();
      }
    });
    
    // Delete ingredient
    tableBody?.addEventListener('click', (e) => {
      const deleteButton = (e.target as Element).closest('.recipe-ingredient-block__delete-ingredient');
      if (deleteButton) {
        const row = deleteButton.closest('.recipe-ingredient-block__ingredient-row');
        const allRows = wrapper.querySelectorAll('.recipe-ingredient-block__ingredient-row');
        
        // Don't delete if it's the last ingredient
        if (allRows.length > 1) {
          row?.remove();
        }
      }
    });

    // Enhanced quantity validation
    tableBody?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('recipe-ingredient-block__quantity')) {
        this._validateQuantityInput(target);
      }
    });
  }

  private _validateQuantityInput(input: HTMLInputElement): void {
    const value = input.value;
    
    // Allow empty
    if (!value) return;
    
    // Regular expression for valid quantity formats:
    // - Numbers: 1, 1.5, 0.25
    // - Simple fractions: 1/2, 3/4
    // - Mixed fractions: 1 1/2, 2 3/4
    const validPatterns = [
      /^\d*\.?\d+$/, // Decimal numbers
      /^\d+\/\d+$/, // Simple fractions
      /^\d+\s+\d+\/\d+$/ // Mixed fractions
    ];
    
    const isValid = validPatterns.some(pattern => pattern.test(value.trim()));
    
    if (!isValid) {
      input.setCustomValidity('Enter a number, decimal, or fraction (e.g., 1, 1.5, 1/2, 1 1/2)');
      input.classList.add('recipe-ingredient-block__quantity--invalid');
    } else {
      input.setCustomValidity('');
      input.classList.remove('recipe-ingredient-block__quantity--invalid');
    }
  }

  private _generateId(): string {
    return 'ingredient_' + Math.random().toString(36).substr(2, 9);
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
      title: { 
        b: true, 
        i: true, 
        strong: true, 
        em: true 
      },
      servings: false, // Number only
      ingredients: {
        id: false,
        quantity: false, // Number/string only
        unit: false, // Predefined options only
        ingredient: { 
          b: true, 
          i: true, 
          strong: true, 
          em: true 
        },
        notes: { 
          b: true, 
          i: true, 
          strong: true, 
          em: true 
        }
      }
    };
  }
}
