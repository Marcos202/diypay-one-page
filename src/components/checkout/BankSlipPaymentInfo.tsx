
import { Barcode } from "lucide-react";

export const BankSlipPaymentInfo = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Barcode className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h4 className="text-lg sm:text-xl font-bold text-gray-800">Boleto Bancário</h4>
          <p className="text-gray-600 font-medium">Pagamento tradicional e confiável</p>
        </div>
      </div>
      
      <p className="text-gray-700 leading-relaxed">
        Você será direcionado para a página com o boleto para pagamento em qualquer banco, 
        lotérica ou pelo app do seu banco. <strong>Pode levar até 3 dias úteis para compensar.</strong>
      </p>
    </div>
  );
};
