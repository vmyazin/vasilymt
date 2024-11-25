// scripts/compiler.js
const md = require('markdown-it')({ html: true });
const fs = require('fs-extra');
const path = require('path');
const removeMd = require('remove-markdown');
const Fuse = require('fuse.js');

class Compiler {
    constructor(path) {
        this.path = path;
        this.searchIndex = [];
        this.fuse = null;
    }

    async getFiles() {
        if (!this.files_) {
            this.files_ = await this.listFiles();
        }
        return this.files_;
    }

    async compileAll() {
        const files = await this.getFiles();
        await Promise.all(files.map(async (f) => {
            const parsed = await this.parseFile(f);
            if (parsed) {
                // Add to search index during compilation
                this.addToSearchIndex(parsed, f);
            }
        }));

        // After processing all files, initialize search and save index
        await this.finalizeSearchIndex();
        return true;
    }

    // New method to add content to search index
    addToSearchIndex(parsed, file) {
        if (!parsed || !parsed.meta) return;

        const { meta, content } = parsed;
        
        this.searchIndex.push({
            id: path.basename(file, '.md'),
            type: 'article',
            title: meta.title || '',
            description: meta.description || '',
            tags: meta.tags || [],
            content: this.cleanTextForSearch(content),
            url: `/blog/${meta.slug || path.basename(file, '.md')}`,
            date: meta.date || '',
            author: meta.author || ''
        });
    }

    // New method to clean text for search
    cleanTextForSearch(text) {
        return removeMd(text)
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    // New method to initialize Fuse and save index
    async finalizeSearchIndex() {
        // Configure Fuse options
        const fuseOptions = {
            includeScore: true,
            threshold: 0.3,
            minMatchCharLength: 2,
            keys: [
                { name: 'title', weight: 0.4 },
                { name: 'description', weight: 0.3 },
                { name: 'content', weight: 0.2 },
                { name: 'tags', weight: 0.1 }
            ]
        };

        this.fuse = new Fuse(this.searchIndex, fuseOptions);

        // Save search index to public directory
        const indexPath = path.join(process.cwd(), 'public', 'search-index.json');
        await fs.ensureFile(indexPath);
        await fs.writeJson(indexPath, {
            lastUpdated: new Date().toISOString(),
            items: this.searchIndex
        }, { spaces: 2 });
    }

    async renderContent(file) {
        const content = (await this.getContent(file)).content;
        return md.render(content);
    }

    async parseMeta(string, file) {
        const lines = string.split("\n");
        const meta = {};
        lines.forEach(l => {
            const i = l.indexOf(':');
            if (i > -1) meta[l.substring(0, i)] = l.substring(i + 1).trim();
        });
        
        Compiler.requiredMetaFields.forEach(requiredField => {
            if (!meta[requiredField]) {
                throwError(`${requiredField} is not included in <meta> for ${file}`);
            }
        });
        
        meta.slug = file.substr(0, file.length - 3);
        const tags = meta.tags;
        meta.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        return meta;
    }

    async parseFile(file) {
        try {
            const string = await fs.readFile(path.join(this.path, file), 'utf8');
            const metaIndexStart = string.indexOf('---');
            const metaIndexEnds = string.indexOf('---', metaIndexStart + 1);
            const content = string.substring(metaIndexEnds + 3);
            const metaString = string.substring(0, metaIndexEnds);
            const meta = await this.parseMeta(metaString, file);
            return { meta, content };
        } catch (err) {
            console.log("Error in format occurred. Follow the pattern to create a file.", file, "\n", err);
            return null;
        }
    }

    async listMeta() {
        const files = await this.getFiles();
        const meta = [];
        for(let i = 0; i < files.length; i++) {
            const parsed = await this.parseFile(files[i]);
            if (parsed && parsed.meta) {
                meta.push(parsed.meta);
            }
        }
        return meta;
    }

    async getContent(file) {
        const content = await this.parseFile(file);
        return content;
    }

    async listFiles() {
        try {
            return await fs.readdir(this.path);
        } catch (err) {
            console.error('Error occurred while reading directory', err);
            return [];
        }
    }

    // New method to perform search
    search(query) {
        if (!this.fuse || !query || query.length < 2) {
            return {
                results: [],
                suggestions: []
            };
        }

        const searchResults = this.fuse.search(query);
        const results = searchResults.map(result => ({
            ...result.item,
            score: 1 - result.score,
            matches: result.matches
        }));

        // Get suggestions from top results
        const suggestions = this.getSuggestions(query, results);

        return {
            results,
            suggestions,
            originalQuery: query
        };
    }

    // Helper method for search suggestions
    getSuggestions(query, results) {
        if (results.length === 0) return [];
        
        return results
            .slice(0, 3)
            .map(result => result.item.title.toLowerCase().split(' '))
            .flat()
            .filter((word, index, self) => 
                word.length > 2 && 
                self.indexOf(word) === index
            );
    }
}

function throwError(message) {
    console.error("You messed up the file names. 😅");
    console.error(message);
    process.exit();
}

Compiler.requiredMetaFields = ['title', 'description'];
Compiler.requiredTags = ['meta', 'content'];

module.exports = Compiler;