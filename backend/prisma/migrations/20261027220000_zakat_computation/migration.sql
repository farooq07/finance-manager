-- Each Zakat payment keeps the calculation it was based on.
ALTER TABLE "zakat" ADD COLUMN "computation" JSONB;
