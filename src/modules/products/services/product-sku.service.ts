import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ProductSkuService {
  generateVariantSKU(
    productName: string,
    attributes: Record<string, any>,
  ): string {
    // Limpiar y acortar el nombre del producto (máximo 10 caracteres)
    const productPrefix = productName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, '-') // Espacios a guiones
      .substring(0, 10);

    // Extraer valores de los atributos (talla, color, tamaño, etc.)
    const attrParts: string[] = [];

    // Orden de prioridad común: talla, color, tamaño, etc.
    const priorityKeys = ['talla', 'size', 'color', 'tamaño', 'material'];

    // Agregar atributos prioritarios primero
    priorityKeys.forEach((key) => {
      const value =
        attributes[key] ||
        attributes[key.toUpperCase()] ||
        attributes[key.toLowerCase()];
      if (value) {
        attrParts.push(
          String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5),
        );
      }
    });

    // Agregar otros atributos no prioritarios
    Object.entries(attributes).forEach(([key, value]) => {
      if (!priorityKeys.includes(key.toLowerCase()) && value) {
        attrParts.push(
          String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5),
        );
      }
    });

    // Formato: PRODUCTO-ATTR1-ATTR2-...
    const sku = [productPrefix, ...attrParts].join('-');

    // Limitar longitud total del SKU
    return sku.substring(0, 50);
  }

  validateUniqueSKUs(variants: any[]): void {
    const skus = variants.map((v) => v.sku).filter(Boolean);
    const duplicates = skus.filter((sku, idx) => skus.indexOf(sku) !== idx);

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `SKUs duplicados en las variantes: ${duplicates.join(', ')}`,
      );
    }
  }

  processVariants(productName: string, variants: any[]): any[] {
    if (!variants || variants.length === 0) {
      return variants;
    }

    return variants.map((variant) => {
      // Si no tiene SKU, autogenerar
      if (!variant.sku) {
        return {
          ...variant,
          sku: this.generateVariantSKU(productName, variant.attributes),
        };
      }
      // Si tiene SKU, usarlo tal cual
      return variant;
    });
  }
}