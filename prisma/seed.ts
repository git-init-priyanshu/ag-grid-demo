import "dotenv/config";
import prisma from "../lib/prisma";

const books = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic", publishedYear: 1925, pages: 180, rating: 4.4, price: 12.99, stock: 45, language: "English", publisher: "Scribner" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classic", publishedYear: 1960, pages: 281, rating: 4.8, price: 14.99, stock: 62, language: "English", publisher: "J. B. Lippincott & Co." },
  { title: "1984", author: "George Orwell", genre: "Dystopian", publishedYear: 1949, pages: 328, rating: 4.7, price: 11.99, stock: 38, language: "English", publisher: "Secker & Warburg" },
  { title: "Pride and Prejudice", author: "Jane Austen", genre: "Romance", publishedYear: 1813, pages: 432, rating: 4.6, price: 9.99, stock: 55, language: "English", publisher: "T. Egerton" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", genre: "Coming-of-age", publishedYear: 1951, pages: 234, rating: 4.0, price: 13.49, stock: 29, language: "English", publisher: "Little, Brown and Company" },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez", genre: "Magical Realism", publishedYear: 1967, pages: 417, rating: 4.6, price: 15.99, stock: 22, language: "Spanish", publisher: "Harper & Row" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", publishedYear: 1937, pages: 310, rating: 4.7, price: 14.49, stock: 71, language: "English", publisher: "George Allen & Unwin" },
  { title: "Brave New World", author: "Aldous Huxley", genre: "Dystopian", publishedYear: 1932, pages: 288, rating: 4.3, price: 12.49, stock: 33, language: "English", publisher: "Chatto & Windus" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", genre: "Psychological Fiction", publishedYear: 1866, pages: 671, rating: 4.5, price: 11.99, stock: 18, language: "Russian", publisher: "The Russian Messenger" },
  { title: "The Alchemist", author: "Paulo Coelho", genre: "Adventure", publishedYear: 1988, pages: 197, rating: 4.2, price: 10.99, stock: 88, language: "Portuguese", publisher: "HarperOne" },
  { title: "Don Quixote", author: "Miguel de Cervantes", genre: "Classic", publishedYear: 1605, pages: 863, rating: 4.3, price: 16.99, stock: 12, language: "Spanish", publisher: "Francisco de Robles" },
  { title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", publishedYear: 1965, pages: 412, rating: 4.6, price: 15.49, stock: 41, language: "English", publisher: "Chilton Books" },
  { title: "The Road", author: "Cormac McCarthy", genre: "Post-Apocalyptic", publishedYear: 2006, pages: 287, rating: 4.1, price: 13.99, stock: 27, language: "English", publisher: "Alfred A. Knopf" },
  { title: "Norwegian Wood", author: "Haruki Murakami", genre: "Literary Fiction", publishedYear: 1987, pages: 296, rating: 4.0, price: 14.99, stock: 35, language: "Japanese", publisher: "Kodansha" },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "Non-Fiction", publishedYear: 2011, pages: 443, rating: 4.5, price: 18.99, stock: 56, language: "Hebrew", publisher: "Harvill Secker" },
  { title: "The Kite Runner", author: "Khaled Hosseini", genre: "Drama", publishedYear: 2003, pages: 371, rating: 4.4, price: 13.49, stock: 42, language: "English", publisher: "Riverhead Books" },
  { title: "Frankenstein", author: "Mary Shelley", genre: "Gothic", publishedYear: 1818, pages: 280, rating: 4.2, price: 9.49, stock: 31, language: "English", publisher: "Lackington, Hughes" },
  { title: "Atomic Habits", author: "James Clear", genre: "Self-Help", publishedYear: 2018, pages: 320, rating: 4.8, price: 16.99, stock: 95, language: "English", publisher: "Avery" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", genre: "Fantasy", publishedYear: 2007, pages: 662, rating: 4.6, price: 15.99, stock: 24, language: "English", publisher: "DAW Books" },
  { title: "Educated", author: "Tara Westover", genre: "Memoir", publishedYear: 2018, pages: 334, rating: 4.7, price: 14.99, stock: 48, language: "English", publisher: "Random House" },
];

async function main() {
  console.log("Seeding database...");

  await prisma.book.deleteMany();

  for (const book of books) {
    await prisma.book.create({ data: {...book, userId: ""} });
  }

  console.log(`Seeded ${books.length} books.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
