/**
 * Utility functions for quote and invoice calculations
 */

/**
 * Calculate all quote data including costs, markups, and totals
 * @param {Array} selectedItems - Array of selected items with their properties
 * @param {Array} hiddenCosts - Array of hidden costs
 * @param {number} globalMarkup - The global markup percentage
 * @param {string} distributionMethod - Method for distributing hidden costs ('even' or 'proportional')
 * @param {boolean} vatEnabled - Whether VAT is enabled
 * @param {number} vatRate - VAT rate percentage
 * @returns {Object} Object containing all calculated values
 */
export function calculateQuoteData(
  selectedItems = [], 
  hiddenCosts = [], 
  globalMarkup = 20, 
  distributionMethod = 'even',
  vatEnabled = false,
  vatRate = 20
) {
    // Get visible and hidden items
    const visibleItems = selectedItems.filter(item => !item.hideInQuote);
    const hiddenItems = selectedItems.filter(item => item.hideInQuote);
    
    // Calculate base costs
    const visibleBaseCost = visibleItems.reduce((sum, item) => 
      sum + (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0), 0);
    
    const hiddenItemsCost = hiddenItems.reduce((sum, item) => 
      sum + (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0), 0);
    
    // Calculate manual hidden costs
    const manualHiddenCosts = hiddenCosts.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
    
    // Total hidden costs
    const totalHiddenCost = manualHiddenCosts + hiddenItemsCost;
    
    // Calculate individual item totals and overall markup
    let totalMarkup = 0;
    let visibleTotal = 0;
    
    const itemTotals = visibleItems.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.cost) || 0;
      const baseCost = cost * quantity;
      let hiddenCostShare = 0;
      
      // Distribute hidden costs according to selected method
      if (visibleItems.length > 0) {
        if (distributionMethod === 'even') {
          // Divide hidden costs evenly among visible items
          hiddenCostShare = totalHiddenCost / visibleItems.length;
        } else if (distributionMethod === 'proportional' && visibleBaseCost > 0) {
          // Distribute hidden costs proportionally to item cost
          hiddenCostShare = totalHiddenCost * (baseCost / visibleBaseCost);
        }
      }
      
      // Calculate markup - check if the item has a specific markup, otherwise use the global one
      const markupPercent = (typeof item.markup === 'number' && !isNaN(item.markup)) 
        ? item.markup 
        : globalMarkup;
      
      // Calculate costs with markup
      const costWithHidden = baseCost + hiddenCostShare;
      const markupAmount = costWithHidden * (markupPercent / 100);
      const finalTotal = costWithHidden + markupAmount;
      
      // Calculate per-unit price for the quote
      const unitPrice = quantity > 0 ? finalTotal / quantity : 0;
      
      // Add to totals
      totalMarkup += markupAmount;
      visibleTotal += finalTotal;
      
      // Return calculated values for this item
      return {
        ...item,
        name: item.name || 'Unnamed Item',
        quantity,
        baseCost,
        hiddenCostShare,
        costWithHidden,
        markupPercentage: markupPercent,
        markupAmount,
        finalTotal,
        unitPrice
      };
    });
    
    // Calculate profit percentage
    const totalCostBeforeMarkup = visibleBaseCost + totalHiddenCost;
    const profitPercentage = totalCostBeforeMarkup > 0 ? 
      (totalMarkup / totalCostBeforeMarkup) * 100 : 0;
    
    // Calculate VAT if enabled
    const vatAmount = vatEnabled ? (visibleTotal * (vatRate / 100)) : 0;
    
    // Add VAT to the grand total if enabled
    const grandTotal = vatEnabled ? (visibleTotal + vatAmount) : visibleTotal;
    
    // Return all calculated values
    return {
      visibleItems,
      hiddenItems,
      visibleItemsCount: visibleItems.length,
      visibleBaseCost,
      hiddenItemsCost,
      manualHiddenCosts,
      totalHiddenCost,
      totalMarkup,
      visibleTotal,
      vatEnabled,
      vatRate,
      vatAmount,
      grandTotal,
      profitPercentage,
      itemTotals,
      distributionMethod
    };
  }
  
  /**
   * Calculate payment schedule based on quote details
   * 
   * @param {Object} quote - The quote object
   * @returns {Array} Array of payment stages
   */
  export const calculatePaymentSchedule = (quote) => {
    if (!quote) return [];
    
    // Determine the total amount
    const total = typeof quote.grandTotal === 'number' 
      ? quote.grandTotal 
      : (calculateQuoteData(
          quote.selectedItems || [], 
          quote.hiddenCosts || [], 
          quote.globalMarkup || 0, 
          quote.distributionMethod || 'even',
          quote.vatEnabled,
          quote.vatRate
        ).grandTotal);
    
    // Get payment terms
    const paymentTerms = quote.paymentTerms;
    
    let schedule = [];
    
    if (paymentTerms === '1') {
      // 50% deposit, 50% on completion
      schedule = [
        {
          stage: 'deposit',
          description: 'Deposit - 50%',
          amount: total * 0.5,
          dueWhen: 'On order confirmation'
        },
        {
          stage: 'final',
          description: 'Final Payment - 50%',
          amount: total * 0.5,
          dueWhen: 'On completion of work'
        }
      ];
    } else if (paymentTerms === '2') {
      // 50% deposit, 25% on joinery completion, 25% final
      schedule = [
        {
          stage: 'deposit',
          description: 'Deposit - 50%',
          amount: total * 0.5,
          dueWhen: 'On order confirmation'
        },
        {
          stage: 'interim',
          description: 'Interim Payment - 25%',
          amount: total * 0.25,
          dueWhen: 'On completion of joinery'
        },
        {
          stage: 'final',
          description: 'Final Payment - 25%',
          amount: total * 0.25,
          dueWhen: 'On completion of work'
        }
      ];
    } else if (paymentTerms === '4') {
      // Full payment before delivery
      schedule = [
        {
          stage: 'full',
          description: 'Full Payment - 100%',
          amount: total,
          dueWhen: 'Before delivery'
        }
      ];
    } else if (paymentTerms === '3' && quote.customTerms) {
      // Custom payment terms - just create a single payment
      schedule = [
        {
          stage: 'custom',
          description: 'Payment - 100%',
          amount: total,
          dueWhen: 'As per custom terms'
        }
      ];
    }
    
    return schedule;
  };
  
  /**
   * Calculate CIS deduction for an invoice
   * @param {Object} invoice - The invoice object
   * @param {Array} labourItems - Array of labour items
   * @param {number} cisRate - CIS deduction rate (percentage)
   * @returns {Object} Object with CIS calculation results
   */
  export function calculateCISDeduction(invoice, labourItems, cisRate = 20) {
    if (!invoice || !labourItems || labourItems.length === 0) {
      return {
        invoiceTotal: invoice ? invoice.amount : 0,
        labourTotal: 0,
        nonLabourAmount: invoice ? invoice.amount : 0,
        cisDeduction: 0,
        finalTotal: invoice ? invoice.amount : 0
      };
    }
    
    // Calculate total labour cost
    const labourTotal = labourItems.reduce((sum, item) => 
      sum + (parseFloat(item.totalCost) || 0), 0);
    
    // Calculate the non-labour portion of the invoice
    const invoiceTotal = parseFloat(invoice.amount) || 0;
    const nonLabourAmount = invoiceTotal - labourTotal;
    
    // Calculate CIS deduction
    const cisDeduction = labourTotal * (cisRate / 100);
    
    // Calculate final total
    const finalTotal = invoiceTotal - cisDeduction;
    
    return {
      invoiceTotal,
      labourTotal,
      nonLabourAmount,
      cisDeduction,
      cisRate,
      finalTotal
    };
  }
  
  /**
   * Calculate VAT for an invoice (when CIS is not applied)
   * @param {Object} invoice - The invoice object
   * @param {boolean} vatEnabled - Whether VAT is enabled
   * @param {number} vatRate - VAT rate percentage
   * @returns {Object} Object with VAT calculation results
   */
  export function calculateVAT(invoice, vatEnabled = false, vatRate = 20) {
    if (!invoice || !vatEnabled) {
      return {
        subtotal: invoice ? invoice.amount : 0,
        vatAmount: 0,
        total: invoice ? invoice.amount : 0
      };
    }
    
    const subtotal = parseFloat(invoice.amount) || 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    
    return {
      subtotal,
      vatRate,
      vatAmount,
      total
    };
  }
  
  /**
   * Format a date as YYYY-MM-DD
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  export function formatDate(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      const year = d.getFullYear();
      
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      
      return [year, month, day].join('-');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }
  
  /**
   * Calculate due date based on settings
   * @param {Date} startDate - The start date
   * @param {Object} settings - Application settings
   * @returns {Date} Calculated due date
   */
  export function calculateDueDate(startDate, settings) {
    // Create a new date object to avoid modifying the original
    const dueDate = new Date(startDate);
    
    // Get payment terms from settings, default to 14 days if not set
    let paymentTerms = 14;
    
    if (settings?.invoice?.defaultPaymentTerms) {
      const terms = settings.invoice.defaultPaymentTerms;
      
      if (terms === 'immediate') {
        // No days added for immediate payment
        return dueDate;
      } else {
        // Try to parse as integer, default to 14 if not a valid number
        const days = parseInt(terms);
        if (!isNaN(days)) {
          paymentTerms = days;
        }
      }
    }
    
    // Add the payment terms in days to the start date
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }