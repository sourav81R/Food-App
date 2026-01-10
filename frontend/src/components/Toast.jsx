import React from 'react';
import { useToast } from '../context/ToastContext';
import { IoClose } from 'react-icons/io5';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const Toast = () => {
    const { toasts, dismissToast } = useToast();

    const getToastStyles = (type) => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-500',
                    icon: <FaCheckCircle className="text-white text-lg flex-shrink-0" />,
                };
            case 'error':
                return {
                    bg: 'bg-red-500',
                    icon: <FaExclamationCircle className="text-white text-lg flex-shrink-0" />,
                };
            case 'warning':
                return {
                    bg: 'bg-amber-500',
                    icon: <FaExclamationTriangle className="text-white text-lg flex-shrink-0" />,
                };
            case 'info':
            default:
                return {
                    bg: 'bg-blue-500',
                    icon: <FaInfoCircle className="text-white text-lg flex-shrink-0" />,
                };
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-auto md:top-4 md:right-4 md:left-auto md:translate-x-0 z-[99999] flex flex-col gap-2 w-[90%] max-w-[360px] md:w-auto md:max-w-[400px]">
            {toasts.map((toast) => {
                const styles = getToastStyles(toast.type);
                return (
                    <div
                        key={toast.id}
                        className={`${styles.bg} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}
                    >
                        {styles.icon}
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button
                            onClick={() => dismissToast(toast.id)}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                        >
                            <IoClose className="text-lg" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Toast;
