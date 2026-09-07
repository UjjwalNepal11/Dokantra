export const VALIDATION = {
  REQUIRED_FIELD: (field: string) => `Please enter your ${field}.`,
  EMAIL_REQUIRED: 'Please enter your email address.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_REQUIRED: 'Please enter your password.',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long.',
  PASSWORD_CONFIRM_REQUIRED: 'Please confirm your new password.',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match.',
  PHONE_INVALID: 'Please enter a valid phone number.',
  PRICE_REQUIRED: 'Please enter a valid price.',
  PRICE_NON_NEGATIVE: 'Price must be greater than or equal to 0.',
  QUANTITY_REQUIRED: 'Please enter a valid quantity.',
  QUANTITY_POSITIVE: 'Quantity must be greater than zero.',
  QUANTITY_INTEGER: 'Quantity must be a whole number.',
  NUMBER_INVALID: 'Please enter a valid number.',
  DATE_REQUIRED: 'Please select a valid date.',
  DATE_INVALID: 'Please select a valid date.',
} as const

export const AUTH = {
  INVALID_CREDENTIALS: 'Invalid credentials.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Try signing in instead.',
  ACCOUNT_CREATED: 'Your account has been created successfully.',
  SIGNED_IN: 'You have signed in successfully.',
  SIGNED_OUT: 'You have been signed out.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  BUSINESS_UPDATED: 'Business information updated successfully.',
} as const

export const HTTP = {
  BAD_REQUEST: "We couldn't process your request. Please check your information and try again.",
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested item could not be found.',
  CONFLICT: 'This action conflicts with existing data. Please review and try again.',
  VALIDATION_ERROR: 'Please correct the highlighted fields and try again.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again in a moment.',
  NETWORK_ERROR:
    'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT: 'The request is taking longer than expected. Please try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
} as const

export const TOAST = {
  SUCCESS_CREATE_PRODUCT: 'Product added successfully.',
  SUCCESS_UPDATE_PRODUCT: 'Product updated successfully.',
  SUCCESS_DELETE_PRODUCT: 'Product deactivated successfully.',
  SUCCESS_CREATE_CUSTOMER: 'Customer added successfully.',
  SUCCESS_UPDATE_CUSTOMER: 'Customer updated successfully.',
  SUCCESS_DELETE_CUSTOMER: 'Customer deactivated successfully.',
  SUCCESS_CREATE_SALE: 'Sale recorded successfully.',
  SUCCESS_CANCEL_SALE: 'Sale cancelled successfully.',
  SUCCESS_CREATE_EXPENSE: 'Expense added successfully.',
  SUCCESS_UPDATE_EXPENSE: 'Expense updated successfully.',
  SUCCESS_DELETE_EXPENSE: 'Expense deleted successfully.',
  SUCCESS_SAVE_SETTINGS: 'Settings saved successfully.',
  SUCCESS_UPDATE_PROFILE: 'Profile updated successfully.',
  SUCCESS_CHANGE_PASSWORD: 'Password changed successfully.',
  SUCCESS_UPDATE_BUSINESS: 'Business information updated successfully.',
  SUCCESS_CREATE_CATEGORY: 'Category added successfully.',
  SUCCESS_UPDATE_CATEGORY: 'Category updated successfully.',
  SUCCESS_DELETE_CATEGORY: 'Category deactivated successfully.',
  SUCCESS_ADJUST_STOCK: 'Stock adjusted successfully.',
  SUCCESS_RESTOCK_STOCK: 'Stock restocked successfully.',
  SUCCESS_DOWNLOAD_INVOICE: 'Invoice downloaded successfully.',
  ERROR_DOWNLOAD_INVOICE: 'Unable to download invoice. Please try again.',
  ERROR_PRINT_INVOICE: 'Unable to prepare invoice for printing. Please try again.',
  ERROR_GENERIC: "We couldn't save your changes. Please try again.",
  ERROR_NETWORK: 'Unable to connect. Please check your internet connection and try again.',
  WARNING_UNSAVED_CHANGES: 'You have unsaved changes.',
} as const

export const EMPTY_STATE = {
  PRODUCTS: {
    TITLE: 'No products yet',
    DESCRIPTION: 'Add your first product to start managing inventory and sales.',
    ACTION: 'Add Product',
    FILTER_TITLE: 'No products match your filters',
    FILTER_DESCRIPTION: 'Try adjusting your search or filter criteria.',
  },
  CUSTOMERS: {
    TITLE: 'No customers yet',
    DESCRIPTION: 'Add your first customer to start building your customer list.',
    ACTION: 'Add Customer',
    FILTER_TITLE: 'No customers match your search',
    FILTER_DESCRIPTION: 'Try adjusting your search or filter criteria.',
  },
  SALES: {
    TITLE: 'No sales yet',
    DESCRIPTION: 'Completed sales will appear here.',
    ACTION: 'Create Sale',
    FILTER_TITLE: 'No sales match your filters',
    FILTER_DESCRIPTION: 'Try adjusting your search or filter criteria.',
  },
  EXPENSES: {
    TITLE: 'No expenses yet',
    DESCRIPTION: 'Record your first business expense to start tracking your costs.',
    ACTION: 'Add Expense',
    FILTER_TITLE: 'No expenses match your filters',
    FILTER_DESCRIPTION: 'Try adjusting your search or filter criteria.',
  },
  CATEGORIES: {
    TITLE: 'No categories yet',
    DESCRIPTION: 'Create categories to organize your products.',
    ACTION: 'Add Category',
  },
  INVENTORY: {
    TITLE: 'No inventory items yet',
    DESCRIPTION: 'Inventory will appear here when products are added.',
  },
  CART: {
    TITLE: 'Your cart is empty',
    DESCRIPTION: 'Search and add products to start a sale.',
  },
  NOTIFICATIONS: {
    TITLE: 'No notifications',
    DESCRIPTION: 'You are all caught up.',
  },
} as const

export const CONFIRM = {
  DELETE_PRODUCT: {
    TITLE: 'Delete product?',
    DESCRIPTION: (name: string) =>
      `Are you sure you want to deactivate "${name}"? The product will be hidden from active listings, but historical sales and inventory records will remain intact.`,
    CONFIRM_LABEL: 'Deactivate',
  },
  DELETE_CUSTOMER: {
    TITLE: 'Delete customer?',
    DESCRIPTION: (name: string) =>
      `Are you sure you want to deactivate "${name}"? The customer will be hidden from active listings, but historical records will remain intact.`,
    CONFIRM_LABEL: 'Deactivate',
  },
  DELETE_CATEGORY: {
    TITLE: (name: string) => `Deactivate ${name}?`,
    DESCRIPTION: (name: string) =>
      `This will deactivate the "${name}" category. Products in this category will no longer be selectable in product forms.`,
    CONFIRM_LABEL: 'Deactivate',
  },
  DELETE_EXPENSE: {
    TITLE: 'Delete expense?',
    DESCRIPTION: (description: string) =>
      `Are you sure you want to delete "${description}"? This action cannot be undone.`,
    CONFIRM_LABEL: 'Delete',
  },
  CANCEL_SALE: {
    TITLE: 'Cancel sale?',
    DESCRIPTION:
      'Are you sure you want to cancel this sale? This will restore the stock for all items in this sale.',
    CONFIRM_LABEL: 'Cancel sale',
    CANCEL_LABEL: 'Keep sale',
  },
  ADJUST_STOCK: {
    TITLE: 'Adjust stock?',
    DESCRIPTION: (quantityChange: number, productName: string) =>
      `You are about to ${quantityChange >= 0 ? 'increase' : 'decrease'} stock for "${productName}" by ${Math.abs(quantityChange)} units.`,
    CONFIRM_LABEL: 'Confirm',
  },
} as const

export const LOADING = {
  SIGNING_IN: 'Signing in...',
  CREATING_ACCOUNT: 'Creating your account...',
  SAVING_CHANGES: 'Saving changes...',
  ADDING_PRODUCT: 'Adding product...',
  UPDATING_PRODUCT: 'Updating product...',
  DELETING_PRODUCT: 'Deleting product...',
  ADDING_CUSTOMER: 'Adding customer...',
  UPDATING_CUSTOMER: 'Updating customer...',
  DELETING_CUSTOMER: 'Deleting customer...',
  RECORDING_SALE: 'Recording sale...',
  CANCELLING_SALE: 'Cancelling sale...',
  ADDING_EXPENSE: 'Adding expense...',
  UPDATING_EXPENSE: 'Updating expense...',
  DELETING_EXPENSE: 'Deleting expense...',
  LOADING_PRODUCTS: 'Loading products...',
  LOADING_CUSTOMERS: 'Loading customers...',
  LOADING_SALES: 'Loading sales...',
  LOADING_EXPENSES: 'Loading expenses...',
  GENERATING_REPORT: 'Generating report...',
  SAVING_SETTINGS: 'Saving settings...',
  UPDATING_PROFILE: 'Updating profile...',
  CHANGING_PASSWORD: 'Changing password...',
  UPDATING_BUSINESS: 'Updating business...',
  ADJUSTING_STOCK: 'Adjusting stock...',
  RESTOCKING_STOCK: 'Restocking stock...',
} as const
