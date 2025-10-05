
import { useParams } from 'react-router-dom';
import { ProducerLayout } from "@/components/ProducerLayout";
import ProductForm from "@/components/products/ProductForm";

const EditProductPage = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Editar Produto</h1>
        <p className="text-muted-foreground mt-2">Altere as informações do produto</p>
      </div>
      
      <ProductForm productId={id} mode="edit" />
    </ProducerLayout>
  );
};

export default EditProductPage;
