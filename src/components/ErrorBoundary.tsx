import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by React ErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans p-6 text-center">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl max-w-lg w-full border border-gray-100 relative overflow-hidden">
            {/* Branding Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#203180] to-[#FF7AA6]" />
            
            {/* Alert Icon */}
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 border border-red-100">
              <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
            </div>

            {/* Title */}
            <h2 className="text-[#111827] text-2xl font-black mb-3 tracking-tight">
              Se detectó un problema en el CRM
            </h2>
            
            {/* Message */}
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              El sistema ha encontrado una anomalía en el renderizado o en la sincronización de datos de <span className="font-bold text-[#203180]">KEINSHOP</span>. 
              Tus datos y operaciones se encuentran seguros en nuestros servidores de base de datos.
            </p>

            {/* Technical details accordion */}
            {this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 text-left max-h-36 overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Detalle Técnico:</p>
                <code className="font-mono text-xs text-red-600 break-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </code>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={this.handleReload}
              className="w-full bg-[#FF7AA6] hover:bg-[#ff6194] text-white rounded-xl py-3.5 px-6 font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-200 transition duration-200 cursor-pointer text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refrescar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
