ALTER TABLE "words" DROP CONSTRAINT "words_bookId_books_book_id_fk";
--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_bookId_books_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."books"("book_id") ON DELETE cascade ON UPDATE no action;