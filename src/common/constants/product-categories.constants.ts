export const DEFAULT_PRODUCT_CATEGORIES = {
  // Ropa
  Ropa: [
    { name: 'Polos', slug: 'polos', icon: '👕', order: 1 },
    { name: 'Camisas', slug: 'camisas', icon: '👔', order: 2 },
    { name: 'Pantalones', slug: 'pantalones', icon: '👖', order: 3 },
    { name: 'Shorts', slug: 'shorts', icon: '🩳', order: 4 },
    { name: 'Vestidos', slug: 'vestidos', icon: '👗', order: 5 },
    { name: 'Faldas', slug: 'faldas', icon: '👗', order: 6 },
    { name: 'Casacas', slug: 'casacas', icon: '🧥', order: 7 },
    { name: 'Buzos', slug: 'buzos', icon: '🧥', order: 8 },
    { name: 'Ropa Interior', slug: 'ropa-interior', icon: '🩲', order: 9 },
    { name: 'Medias', slug: 'medias', icon: '🧦', order: 10 },
    { name: 'Ropa Deportiva', slug: 'ropa-deportiva', icon: '🏃', order: 11 },
  ],

  // Accesorios
  Accesorios: [
    { name: 'Carteras', slug: 'carteras', icon: '👜', order: 1 },
    { name: 'Billeteras', slug: 'billeteras', icon: '💼', order: 2 },
    { name: 'Mochilas', slug: 'mochilas', icon: '🎒', order: 3 },
    { name: 'Gorros', slug: 'gorros', icon: '🧢', order: 4 },
    { name: 'Sombreros', slug: 'sombreros', icon: '👒', order: 5 },
    { name: 'Lentes', slug: 'lentes', icon: '🕶️', order: 6 },
    { name: 'Relojes', slug: 'relojes', icon: '⌚', order: 7 },
    { name: 'Joyas', slug: 'joyas', icon: '💍', order: 8 },
    { name: 'Collares', slug: 'collares', icon: '📿', order: 9 },
    { name: 'Aretes', slug: 'aretes', icon: '💎', order: 10 },
    { name: 'Pulseras', slug: 'pulseras', icon: '⛓️', order: 11 },
    { name: 'Cinturones', slug: 'cinturones', icon: '👔', order: 12 },
  ],

  // Tecnología
  Tecnología: [
    { name: 'Celulares', slug: 'celulares', icon: '📱', order: 1 },
    { name: 'Laptops', slug: 'laptops', icon: '💻', order: 2 },
    { name: 'Tablets', slug: 'tablets', icon: '📱', order: 3 },
    { name: 'Audífonos', slug: 'audifonos', icon: '🎧', order: 4 },
    { name: 'Parlantes', slug: 'parlantes', icon: '🔊', order: 5 },
    { name: 'Cargadores', slug: 'cargadores', icon: '🔌', order: 6 },
    { name: 'Cables', slug: 'cables', icon: '🔌', order: 7 },
    { name: 'Fundas y Protectores', slug: 'fundas-protectores', icon: '📱', order: 8 },
    { name: 'Smart Watch', slug: 'smart-watch', icon: '⌚', order: 9 },
    { name: 'Cámaras', slug: 'camaras', icon: '📷', order: 10 },
    { name: 'Accesorios Gaming', slug: 'accesorios-gaming', icon: '🎮', order: 11 },
  ],

  // Alimentos
  Alimentos: [
    { name: 'Bebidas', slug: 'bebidas', icon: '🥤', order: 1 },
    { name: 'Snacks', slug: 'snacks', icon: '🍿', order: 2 },
    { name: 'Dulces', slug: 'dulces', icon: '🍬', order: 3 },
    { name: 'Panadería', slug: 'panaderia', icon: '🍞', order: 4 },
    { name: 'Repostería', slug: 'reposteria', icon: '🍰', order: 5 },
    { name: 'Comida Preparada', slug: 'comida-preparada', icon: '🍱', order: 6 },
    { name: 'Frutas', slug: 'frutas', icon: '🍎', order: 7 },
    { name: 'Verduras', slug: 'verduras', icon: '🥬', order: 8 },
    { name: 'Lácteos', slug: 'lacteos', icon: '🥛', order: 9 },
    { name: 'Carnes', slug: 'carnes', icon: '🥩', order: 10 },
    { name: 'Abarrotes', slug: 'abarrotes', icon: '🛒', order: 11 },
  ],

  // Hogar
  Hogar: [
    { name: 'Muebles', slug: 'muebles', icon: '🛋️', order: 1 },
    { name: 'Decoración', slug: 'decoracion', icon: '🖼️', order: 2 },
    { name: 'Cocina', slug: 'cocina', icon: '🍳', order: 3 },
    { name: 'Baño', slug: 'bano', icon: '🚿', order: 4 },
    { name: 'Dormitorio', slug: 'dormitorio', icon: '🛏️', order: 5 },
    { name: 'Sala', slug: 'sala', icon: '🛋️', order: 6 },
    { name: 'Jardín', slug: 'jardin', icon: '🌱', order: 7 },
    { name: 'Textiles', slug: 'textiles', icon: '🧵', order: 8 },
    { name: 'Organización', slug: 'organizacion', icon: '📦', order: 9 },
    { name: 'Iluminación', slug: 'iluminacion', icon: '💡', order: 10 },
    { name: 'Electrodomésticos', slug: 'electrodomesticos', icon: '🔌', order: 11 },
  ],

  // Default para categorías no mapeadas o "Prueba"
  Default: [
    { name: 'Productos Generales', slug: 'productos-generales', icon: '📦', order: 1 },
    { name: 'Ofertas', slug: 'ofertas', icon: '🏷️', order: 2 },
    { name: 'Novedades', slug: 'novedades', icon: '✨', order: 3 },
    { name: 'Destacados', slug: 'destacados', icon: '⭐', order: 4 },
  ],
};