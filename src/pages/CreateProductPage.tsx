
import { ProducerLayout } from "@/components/ProducerLayout";
import ProductForm from "@/components/products/ProductForm";

const CreateProductPage = () => {
  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Criar Novo Produto</h1>
        <p className="text-muted-foreground mt-2">Preencha as informações do seu produto</p>
      </div>
      
      <ProductForm mode="create" />
    </ProducerLayout>
  );
};

export default CreateProductPage;
