
// Module-scope storage (The "Checkroom")
// Maps a unique ID (ticket) to the array of linkedFiles binaries (backpack)
const registry = new Map<string, any[]>();

export const SmartObjectRegistry = {
  /**
   * Stores the heavy  binary data and associates it with a unique ID.
   * @param id The reference ID (usually the Node ID).
   * @param data The linkedFiles array from ag-psd.
   */
  set: (id: string, data: any[]) => {
    registry.set(id, data);
  },

  /**
   * Retrieves the binary data using the reference ID.
   * @param id The reference ID.
   */
  get: (id: string): any[] | undefined => {
    return registry.get(id);
  },

  /**
   * Checks if data exists for the given ID.
   */
  has: (id: string): boolean => {
    return registry.has(id);
  },

  /**
   * Removes data from the registry.
   */
  delete: (id: string) => {
    registry.delete(id);
  },

  /**
   * Clears all stored data.
   */
  clear: () => {
    registry.clear();
  }
};
