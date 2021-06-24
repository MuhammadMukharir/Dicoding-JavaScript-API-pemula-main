'use strict';
// tutorial from https://akhromieiev.com/tutorials/creating-a-simple-rest-api-with-node-and-hapi-in-10-min/
// catatan: dalam pengumplan berkas (yg sudah ZIP) tidak ada komentar ini, jadi aman

const Hapi = require('hapi');
const fs = require('fs');
const util = require('util');

const { nanoid } = require("nanoid");

// modelx = nanoid(); //=> "V1StGXR8_Z5jdHi6B-myT"
// console.log(modelx);

// console.log(new Date().toISOString());

// Convert fs.readFile, fs.writeFile into Promise version of same
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Setup server
const server = Hapi.server({
    debug: { request: ["*"], log: ["*"] },
    port: 5000,
    host: 'localhost',
    // routes: { cors: { origin: ["*"] } }
    routes: { cors: true }
});


// Creating a new book
server.route({
    method: 'POST',
    path: '/books',
    handler: async (request, h) => {
        try {
            // console.log(request.payload.year);
            // const book = JSON.parse(request.payload);
            // console.log(request.payload);
            const book = request.payload;
            
            const h_resp = {status: 'fail', message: '', bookid: {}};
            // data validation
            if (!(book.name) || book.name === '') {
                h_resp.message = "Gagal menambahkan buku. Mohon isi nama buku";
                return h.response(h_resp).code(400);
            } 
            if (book.pageCount < book.readPage) {
                h_resp.message = "Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount";
                return h.response(h_resp).code(400);
            }

            // generate server side data
            book.id = nanoid();
            book.finished = book.pageCount === book.readPage;
            book.insertedAt = new Date().toISOString();
            book.updatedAt = book.insertedAt;

            // save new book to database (file)
            let books = await readFile('./books.json', 'utf8');
            books = JSON.parse(books);
            books.push(book);
            await writeFile('./books.json', JSON.stringify(books, null, 2), 'utf8');

            // response to client side
            h_resp.status = 'success';
            h_resp.message = "Buku berhasil ditambahkan";
            h_resp.data = {bookId: book.id};

            // h.headers['content-type'] = 'application/json';
            return h.response(h_resp).code(201);
           
        } catch (e) {
            console.log(e);
            const error = {status: 'error', message: 'Buku gagal ditambahkan'};
            return h.response(error).code(500);
        }

    }

});

// Getting list of books
server.route({
    method: 'GET',
    path: '/books',
    handler: async (request, h) => {
        try {
            const h_resp = {status: 'success', data: {}};
            let books = await readFile('./books.json', 'utf8');
            books = JSON.parse(books);

            let params = request.query;
            let parName = params.name;
            let isOnReading = params.reading;
            let isFinished = params.finished;
            const filtered_books_data = [];

            // function for getting book
            function getBook(book) {
                filtered_books_data.push({id: book.id, name: book.name, publisher: book.publisher});
            }
            // if no params requested
            if (Object.keys(params).length === 0) {
                // filter data from database (file)
                books.forEach((book) => {
                    getBook(book);
                });
                
            } else {
                // if ?name, ?reading and ?finished params are requested
                // atribut finished berarti buku telah dibaca, so if isFinished=1 then isOnReading=1
                if (parName && (isOnReading == 0 || isOnReading == 1) && (isFinished == 0 || isFinished == 1)) {
                    // if ?name params requested and search only readed book and finished book
                    if (isFinished == 1) {
                        books.forEach((book) => {
                            if (book.name.toLowerCase().includes(parName.toLowerCase()) && book.finished == 1) {
                                getBook(book);   
                            }
                        });

                    // if ?name params requested and search only (readed or unreaded) book and unfinished book
                    } else if (isFinished == 0) {
                        if (isOnReading == 0) {
                            // if ?name params requested and search only readed book and unfinished book
                            books.forEach((book) => {
                                if (book.name.toLowerCase().includes(parName.toLowerCase()) && book.finished == 0 && book.reading == 0) {
                                    getBook(book);   
                                }
                            });
                            // if ?name params requested and search only readed book and unfinished book
                        } else if (isOnReading == 1) {
                            books.forEach((book) => {
                                if (book.name.toLowerCase().includes(parName.toLowerCase()) && book.finished == 0 && book.reading == 1) {
                                    getBook(book);   
                                }
                            });
                        }
                    } 

                // if ?name and ?reading params are requested
                } else if (parName && (isOnReading == 0 || isOnReading == 1)) {
                    // if ?name params requested and search only unreaded book 
                    if (isOnReading == 0) {
                        books.forEach((book) => {
                            if (book.name.toLowerCase().includes(parName.toLowerCase()) && book.reading == 0) {
                                getBook(book);   
                            }
                        });
                    // if ?name params requested and search only reading book 
                    } else if (isOnReading == 1) {
                        books.forEach((book) => {
                            if (book.name.toLowerCase().includes(parName.toLowerCase()) && book.reading == 1) {
                                getBook(book);   
                            }
                        });
                    }
                    
                // if ?name params requested
                } else if (parName) {
                    books.forEach((book) => {
                        if (book.name.toLowerCase().includes(parName.toLowerCase())) {
                            getBook(book);   
                        }
                    });

                // if ?reading params requested
                } else if (isOnReading == 0 || isOnReading == 1 || isOnReading){
                    // search only unreaded book 
                    if (isOnReading == 0) {
                        books.forEach((book) => {
                            if (book.reading === false) {
                                getBook(book);
                            }
                        });
                    // search only reading book
                    } else if (isOnReading == 1) {
                        books.forEach((book) => {
                            if (book.reading === true) {
                                getBook(book);
                            }
                        });
                    // else
                    } else {
                        books.forEach((book) => {
                            getBook(book);
                        });
                    }

                // if ?finished params requested
                } else if (isFinished == 0 || isFinished == 1 || isFinished){
                    // search only finished book 
                    if (isFinished == 0) {
                        books.forEach((book) => {
                            if (book.finished === false) {
                                getBook(book);
                            }
                        });
                    // search only finished book
                    } else if (isFinished == 1) {
                        books.forEach((book) => {
                            if (book.finished === true) {
                                getBook(book);
                            }
                        });
                    // else
                    } else {
                        books.forEach((book) => {
                            getBook(book);
                        });
                    }
                }
            }
            // response to client side
            h_resp.data = {books: filtered_books_data};
            return h.response(h_resp);
            

        } catch (e) {
            console.log(e);
            const error = {status: 'error', message: 'Gagal mendapatkan buku'};
            return h.response(error).code(500);
        }
    }
});

// Getting a book detail
server.route({
    method: 'GET',
    path: '/books/{bookId}',
    handler: async (request, h) => {
        try {
            const id = request.params.bookId;
            let books = await readFile('./books.json', 'utf8');
            books = JSON.parse(books);

            const h_resp = {status: 'fail', message:'', data: {}};
            let isExist = false;
            // finding book by id
            books.forEach((book) => {
                if (book.id == id) {
                    isExist = true;
                    h_resp.data = {book: book};
                    h_resp.status = 'success';
                    h_resp.message = 'Detail buku berhasil didapatkan';
                    return 0;
                }
            });
            if (isExist) {
                return h.response(h_resp).code(200);
            }
            h_resp.message = 'Buku tidak ditemukan';
            return h.response(h_resp).code(404);

        } catch (e) {
            console.log(e);
            const error = {status: 'error', message: 'Gagal mendapatkan buku'};
            return h.response(error).code(500);
        }
    }
});

// Updating an existing book
server.route({
    method: 'PUT',
    path: '/books/{bookId}',
    handler: async (request, h) => {
        try {
            const updBook = request.payload;
            const id = request.params.bookId;
            let books = await readFile('./books.json', 'utf8');
            books = JSON.parse(books);

            const h_resp = {status: 'fail', message:''};
            // data validation
            if (!(updBook.name) || updBook.name === '') {
                h_resp.message = "Gagal memperbarui buku. Mohon isi nama buku";
                return h.response(h_resp).code(400);
            } 
            if (updBook.pageCount < updBook.readPage) {
                h_resp.message = "Gagal memperbarui buku. readPage tidak boleh lebih besar dari pageCount";
                return h.response(h_resp).code(400);
            }

            let isExist = false;
            // finding book by id and rewriting
            books.forEach((book) => {
                if (book.id == id) {
                    isExist = true;
                    book.name = updBook.name;
                    book.year = updBook.year;
                    book.author = updBook.author;
                    book.summary = updBook.summary;
                    book.publisher = updBook.publisher;
                    book.pageCount = updBook.pageCount;
                    book.readPage = updBook.readPage;
                    book.reading = updBook.reading;
                    book.finished = book.pageCount === book.readPage;
                    book.updatedAt = new Date().toISOString();

                    h_resp.status = 'success';
                    h_resp.message = 'Buku berhasil diperbarui';
                    writeFile('./books.json', JSON.stringify(books, null, 2), 'utf8');
                    return 0;
                }
            });
            if (isExist) {
                return h.response(h_resp).code(200);
            }
            h_resp.message = 'Gagal memperbarui buku. Id tidak ditemukan';
            return h.response(h_resp).code(404);

        } catch (e) {
            console.log(e);
            const error = {status: 'error', message: 'Gagal memperbarui buku'};
            return h.response(error).code(500);
        }
    }
});

// Deleting an existing book
server.route({
    method: 'DELETE',
    path: '/books/{bookId}',
    handler: async (request, h) => {
        try {
            const updBook = request.payload;
            const id = request.params.bookId;
            let books = await readFile('./books.json', 'utf8');
            books = JSON.parse(books);

            const h_resp = {status: 'fail', message:''};
            let isExist = false;
            let filtered_books = [];
                // finding book by id and rewriting
                books.forEach((book) => {
                    if (book.id == id) {
                        isExist = true;
                        h_resp.status = 'success';
                        h_resp.message = 'Buku berhasil dihapus';
                    } else {
                        filtered_books.push(book);
                    }
                });
            await writeFile('./books.json', JSON.stringify(filtered_books, null, 2), 'utf8');
            if (isExist) {
                return h.response(h_resp).code(200);
            }
            h_resp.message = 'Buku gagal dihapus. Id tidak ditemukan';
            return h.response(h_resp).code(404);

        } catch (e) {
            console.log(e);
            const error = {status: 'error', message: 'Gagal menghapus buku'};
            return h.response(error).code(500);
        }
    }
});

const init = async () => {
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();