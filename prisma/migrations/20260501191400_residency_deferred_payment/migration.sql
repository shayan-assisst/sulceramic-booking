-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'BOOK_SESSIONS',
    "sessionFrom" INTEGER NOT NULL,
    "sessionTo" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "PaymentReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentReminder" ("amount", "id", "paid", "paidAt", "sentAt", "sessionFrom", "sessionTo", "stripePaymentId", "userId") SELECT "amount", "id", "paid", "paidAt", "sentAt", "sessionFrom", "sessionTo", "stripePaymentId", "userId" FROM "PaymentReminder";
DROP TABLE "PaymentReminder";
ALTER TABLE "new_PaymentReminder" RENAME TO "PaymentReminder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
