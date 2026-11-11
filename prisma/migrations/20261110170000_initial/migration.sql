CREATE TABLE "Dress" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'new dresss', "sizes" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '', "washCare" TEXT NOT NULL DEFAULT '',
  "shipping" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Dress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dress_createdAt_idx" ON "Dress"("createdAt");
CREATE INDEX "Dress_category_idx" ON "Dress"("category");

CREATE TABLE "DressImage" (
  "id" TEXT NOT NULL, "dressId" TEXT NOT NULL, "fileId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DressImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DressImage_fileId_key" ON "DressImage"("fileId");
CREATE INDEX "DressImage_dressId_idx" ON "DressImage"("dressId");
ALTER TABLE "DressImage" ADD CONSTRAINT "DressImage_dressId_fkey" FOREIGN KEY ("dressId") REFERENCES "Dress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomerOrder" (
  "id" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "address" TEXT NOT NULL,
  "apartment" TEXT NOT NULL DEFAULT '', "city" TEXT NOT NULL, "state" TEXT NOT NULL, "pinCode" TEXT NOT NULL,
  "phone" TEXT NOT NULL, "items" JSONB NOT NULL, "total" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'New order', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerOrder_createdAt_idx" ON "CustomerOrder"("createdAt");
CREATE INDEX "CustomerOrder_phone_idx" ON "CustomerOrder"("phone");

CREATE TABLE "CustomerReview" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "stars" INTEGER NOT NULL, "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UpcomingDress" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Upcoming', "description" TEXT NOT NULL,
  "mainImages" TEXT[], "workingImages" TEXT[], "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UpcomingDress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "subject" TEXT NOT NULL, "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

CREATE TABLE "NewsletterSubscriber" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

CREATE TABLE "Admin" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "labels" JSONB NOT NULL DEFAULT '["admin"]', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "adminId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "adminId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
