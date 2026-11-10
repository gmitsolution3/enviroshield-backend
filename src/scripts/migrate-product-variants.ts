import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/database";
import Product from "../modules/product/product.model";

export async function migrateProductVariants() {
  try {
    await connectDB();
    console.log("Starting product variants migration...");

    const products = await Product.find({});
    console.log(`Found ${products.length} total products in database.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        const weightLabel =
          product.weight && product.weight > 0
            ? `${product.weight} Kg`
            : "Standard";

        const defaultVariant = {
          weight: weightLabel,
          size: weightLabel,
          price: product.price ?? 0,
          costPrice: product.costPrice ?? 0,
          sku: product.sku ?? "",
          stockQuantity: product.stockQuantity ?? 0,
          lowStockThreshold: product.lowStockThreshold ?? 5,
        };

        product.variants = [defaultVariant as any];
        await product.save();
        migratedCount++;
        console.log(`Migrated product: "${product.name}" (${product._id}) with default variant.`);
      } else {
        let changed = false;
        for (const v of product.variants) {
          if (!v.weight && v.size) {
            v.weight = v.size;
            changed = true;
          }
          if (!v.size && v.weight) {
            v.size = v.weight;
            changed = true;
          }
        }
        if (changed) {
          await product.save();
          migratedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log("Migration completed successfully!");
    console.log(`- Migrated: ${migratedCount} products`);
    console.log(`- Already had variants: ${skippedCount} products`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
}

if (require.main === module) {
  migrateProductVariants();
}
