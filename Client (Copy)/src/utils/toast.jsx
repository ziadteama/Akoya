import { toast } from 'react-toastify';

/**
 * Notification utility for consistent toast messages throughout the app
 */
export const notify = {
  /**
   * Display a success toast
   * @param {string} message - Message to display
   */
  success: (message) => toast.success(message),

  /**
   * Display an error toast
   * @param {string} message - Message to display
   */
  error: (message) => toast.error(message),

  /**
   * Display an info toast
   * @param {string} message - Message to display
   */
  info: (message) => toast.info(message),

  /**
   * Display a warning toast
   * @param {string} message - Message to display
   */
  warning: (message) => toast.warning(message)
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