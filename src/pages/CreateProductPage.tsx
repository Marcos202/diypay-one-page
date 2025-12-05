
import { ProducerLayout } from "@/components/ProducerLayout";
import ProductForm from "@/components/products/ProductForm";

const CreateProductPage = () => {
  return (
    <ProducerLayout>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Criar Novo Produto</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Preencha as informações do seu produto</p>
      </div>
      
      <ProductForm mode="create" />
    </ProducerLayout>
  );
};

export default CreateProductPage;
