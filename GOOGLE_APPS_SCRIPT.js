// ============================================
// BUDGET TRACKER - GOOGLE APPS SCRIPT API
// Copiază tot acest cod în Apps Script
// ============================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result;
  
  try {
    switch(action) {
      case 'getTransactions':
        result = getTransactions();
        break;
      case 'addTransaction':
        result = addTransaction(params);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(params.id);
        break;
      case 'updateTransaction':
        result = updateTransaction(params);
        break;
      case 'getBudgets':
        result = getBudgets();
        break;
      case 'updateBudget':
        result = updateBudget(params);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTransactions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const transactions = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // if id exists
      const transaction = {};
      headers.forEach((header, index) => {
        transaction[header] = data[i][index];
      });
      transactions.push(transaction);
    }
  }
  
  return { success: true, data: transactions };
}

function addTransaction(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  const id = Utilities.getUuid();
  
  sheet.appendRow([
    id,
    params.date,
    params.type,
    params.category,
    params.subcategory,
    params.description,
    parseFloat(params.amount)
  ]);
  
  return { success: true, id: id };
}

function deleteTransaction(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Transaction not found' };
}

function updateTransaction(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.id) {
      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        params.date,
        params.type,
        params.category,
        params.subcategory,
        params.description,
        parseFloat(params.amount)
      ]]);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Transaction not found' };
}

function getBudgets() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('budgets');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const budgets = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const budget = {};
      headers.forEach((header, index) => {
        budget[header] = data[i][index];
      });
      budgets.push(budget);
    }
  }
  
  return { success: true, data: budgets };
}

function updateBudget(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('budgets');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.category && data[i][1] === params.subcategory) {
      sheet.getRange(i + 1, 3).setValue(parseFloat(params.budget));
      return { success: true };
    }
  }
  
  // If not found, add new budget
  sheet.appendRow([params.category, params.subcategory, parseFloat(params.budget)]);
  return { success: true };
}
