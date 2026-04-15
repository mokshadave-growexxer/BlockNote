// Lightweight toast notifications using a custom event system
type ToastType = "success" | "error" | "info";

function dispatch(message: string, type: ToastType) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}

const toast = {
  success: (message: string) => dispatch(message, "success"),
  error: (message: string) => dispatch(message, "error"),
  info: (message: string) => dispatch(message, "info"),
};

export default toast;
