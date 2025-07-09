import { toast } from 'react-toastify';

/**
 * Notification utility for consistent toast messages throughout the app
 */
export const notify = {
  /**
   * Display a success toast
   * @param {string} message - Message to display
   * @param {object} options - Toast options
   */
  success: (message, options) => toast.success(message, options),

  /**
   * Display an error toast
   * @param {string} message - Message to display
   * @param {object} options - Toast options
   */
  error: (message, options) => toast.error(message, options),

  /**
   * Display an info toast
   * @param {string} message - Message to display
   * @param {object} options - Toast options
   */
  info: (message, options) => toast.info(message, options),

  /**
   * Display a warning toast
   * @param {string} message - Message to display
   * @param {object} options - Toast options
   */
  warning: (message, options) => toast.warning(message, options),

  /**
   * Dismiss a specific toast or all toasts
   * @param {string|number} toastId - Optional toast ID to dismiss specific toast
   */
  dismiss: (toastId) => toast.dismiss(toastId)
};

/**
 * Display a confirmation dialog with Confirm/Cancel buttons
 * @param {string} message - Message to display
 * @param {function} onConfirm - Function to execute on confirmation
 * @param {function} onCancel - Function to execute on cancellation
 */
export const confirmToast = (message, onConfirm, onCancel) => {
  toast.info(
    <div>
      <p>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <button
          onClick={() => {
            toast.dismiss();
            onConfirm && onConfirm();
          }}
          style={{
            background: '#00AEEF',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => {
            toast.dismiss();
            onCancel && onCancel();
          }}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    {
      autoClose: false,
      closeOnClick: false,
      draggable: false
    }
  );
};

export default notify;