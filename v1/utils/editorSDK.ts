/**
 * Utility to expose Agility SDK functions to Editor.js blocks
 * This makes SDK functions available on the window object for blocks to use
 */

import { assetsMethods } from '@agility/app-sdk';
import type { IAssetItem } from '@agility/app-sdk';

// Extract selectAssets from assetsMethods
const { selectAssets } = assetsMethods;

declare global {
  interface Window {
    selectAssets?: (params: {
      title: string;
      singleSelectOnly: boolean;
      callback: (assets: IAssetItem[]) => void;
    }) => void;
  }
}

/**
 * Initialize SDK utilities for Editor.js blocks
 * Call this when the editor is ready to expose functions to blocks
 */
export function initializeEditorSDK(): void {
  if (typeof window !== 'undefined') {
    // Expose asset selection
    window.selectAssets = selectAssets;
    
    console.log('Editor SDK utilities initialized');
  }
}

/**
 * Clean up SDK utilities when editor is destroyed
 */
export function cleanupEditorSDK(): void {
  if (typeof window !== 'undefined') {
    delete window.selectAssets;
    
    console.log('Editor SDK utilities cleaned up');
  }
}

/**
 * Check if SDK utilities are available
 */
export function isSDKAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.selectAssets === 'function';
}
