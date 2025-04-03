/**
 * Deep merge two objects, recursively merging nested objects
 * @param {Object} target - The target object to merge into
 * @param {Object} source - The source object to merge from
 * @returns {Object} - The merged object
 */
export function deepMerge(target, source) {
  // Create a new object to avoid modifying the target
  const output = { ...target };
  
  // If source is not an object or is null, return target
  if (!source || typeof source !== 'object') {
    return output;
  }
  
  // Loop through source properties
  Object.keys(source).forEach(key => {
    // Get current item from both objects
    const targetItem = output[key];
    const sourceItem = source[key];
    
    // Check if both values are objects and need recursive merging
    if (
      targetItem && 
      typeof targetItem === 'object' && 
      sourceItem && 
      typeof sourceItem === 'object'
    ) {
      // Recursively merge nested objects
      output[key] = deepMerge(targetItem, sourceItem);
    } else if (sourceItem !== undefined) {
      // Source has a value that's not undefined, use it
      output[key] = sourceItem;
    }
    // If source value is undefined, keep the target value
  });
  
  return output;
}