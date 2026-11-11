-- AlterTable: add orderId, backfill existing rows, then make NOT NULL + UNIQUE
ALTER TABLE "CustomerOrder" ADD COLUMN "orderId" TEXT;

-- Backfill existing rows with SEN-YYYYMMDD-NNNN format using a CTE
UPDATE "CustomerOrder" SET "orderId" = sub.oid
FROM (
  SELECT id, 'SEN-' || TO_CHAR("createdAt", 'YYYYMMDD') || '-' || LPAD(
    ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 4, '0'
  ) AS oid
  FROM "CustomerOrder"
) sub
WHERE "CustomerOrder".id = sub.id;

-- Make it NOT NULL and UNIQUE
ALTER TABLE "CustomerOrder" ALTER COLUMN "orderId" SET NOT NULL;
CREATE UNIQUE INDEX "CustomerOrder_orderId_key" ON "CustomerOrder"("orderId");
