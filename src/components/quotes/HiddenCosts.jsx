import React, { useState } from 'react';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import FormField from '../common/FormField';

/**
 * Hidden Costs component for managing additional costs that are distributed across quote items
 * 
 * @param {Object} props - Component props
 * @param {Array} props.hiddenCosts - Array of hidden cost objects
 * @param {Function} props.onAddCost - Callback when a cost is added
 * @param {Function} props.onRemoveCost - Callback when a cost is removed
 * @param {Function} props.onUpdateCost - Callback when a cost is updated
 * @param {string} props.distributionMethod - Method for distributing costs ('even' or 'proportional')
 * @param {Function} props.onDistributionMethodChange - Callback when distribution method changes
 */
const HiddenCosts = ({
  hiddenCosts = [],
  onAddCost,
  onRemoveCost,
  onUpdateCost,
  distributionMethod = 'even',
  onDistributionMethodChange
}) => {
  // State for add cost dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCost, setNewCost] = useState({
    name: '',
    amount: '',
    notes: ''
  });
  
  // Reset new cost form
  const resetNewCostForm = () => {
    setNewCost({
      name: '',
      amount: '',
      notes: ''
    });
  };
  
  // Handle add cost dialog submit
  const handleAddCost = () => {
    if (!newCost.name.trim()) {
      alert('Please enter a description for the hidden cost');
      return;
    }
    
    const amount = parseFloat(newCost.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than zero');
      return;
    }
    
    // Add the new cost
    onAddCost({
      name: newCost.name.trim(),
      amount,
      notes: newCost.notes.trim()
    });
    
    // Close dialog and reset form
    setShowAddDialog(false);
    resetNewCostForm();
  };
  
  return (
    <div className="space-y-4">
      {/* Distribution method selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Method</label>
        <div className="mt-1">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={distributionMethod}
            onChange={(e) => onDistributionMethodChange(e.target.value)}
          >
            <option value="even">Distribute Evenly</option>
            <option value="proportional">Distribute Proportionally</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {distributionMethod === 'even' 
            ? 'Costs will be divided equally among all visible items.' 
            : 'Costs will be distributed in proportion to each item\'s base cost.'}
        </p>
      </div>
      
      {/* Hidden costs list */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-900">Hidden Costs</h3>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
          >
            Add Cost
          </Button>
        </div>
        
        {hiddenCosts.length === 0 ? (
          <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-500 text-center">
            No hidden costs added yet. These costs will be distributed across all visible items in the quote.
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {hiddenCosts.map((cost, index) => (
              <div 
                key={cost.id || index} 
                className="bg-white shadow-sm rounded-md border border-gray-200 p-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{cost.name}</div>
                    {cost.notes && (
                      <div className="text-sm text-gray-500">{cost.notes}</div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Cost amount input */}
                    <div className="w-24">
                      <input
                        type="number"
                        className="block w-full px-2 py-1 text-right text-sm border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={cost.amount}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          onUpdateCost(index, { ...cost, amount });
                        }}
                        min="0"
                        step="0.01"
                        disabled={cost.fromItem || cost.fromCatalog || cost.fromQuote}
                      />
                    </div>
                    
                    {/* Remove button - only show for manually added costs */}
                    {!cost.fromItem && !cost.fromCatalog && !cost.fromQuote && (
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => onRemoveCost(index)}
                        title="Remove cost"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total hidden costs */}
            <div className="flex justify-between items-center font-medium pt-2 border-t border-gray-200">
              <span>Total Hidden Costs:</span>
              <span>£{hiddenCosts.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Add cost dialog */}
      {showAddDialog && (
        <Dialog
          title="Add Hidden Cost"
          isOpen={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            resetNewCostForm();
          }}
          footer={
            <>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAddDialog(false);
                  resetNewCostForm();
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddCost}>
                Add Cost
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField
              label="Description"
              name="cost-name"
              type="text"
              value={newCost.name}
              onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
              placeholder="e.g., Delivery, Waste Disposal, etc."
              required
            />
            
            <FormField
              label="Amount (£)"
              name="cost-amount"
              type="number"
              value={newCost.amount}
              onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
              min="0"
              step="0.01"
              required
            />
            
            <FormField
              label="Notes (Optional)"
              name="cost-notes"
              type="textarea"
              value={newCost.notes}
              onChange={(e) => setNewCost({ ...newCost, notes: e.target.value })}
              placeholder="Additional information about this cost"
              rows={3}
            />
            
            <div className="text-sm text-gray-500">
              This cost will be distributed across all visible items in the quote using the selected distribution method.
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default HiddenCosts;