const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const { promisify } = require('util');
const pdfParse = require('pdf-parse');

// Function to extract data from PDF file
async function extractDataFromPDF(pdfPath) {
    try {
        console.log(`Extracting data from PDF: ${pdfPath}`);
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        
        // Extract the text content
        const text = data.text;
        
        // Define regex patterns for extracting the required information
        const payerPattern = /Payer([^\n]+)/;
        const amountPattern = /Transferred Amount([\d,.]+)\s*ETB/;
        const transactionPattern = /Reference No\.\s*\(VAT Invoice No\)([^\n]+)/;
        
        // Extract the information using regex
        const payerMatch = text.match(payerPattern);
        const amountMatch = text.match(amountPattern);
        const transactionMatch = text.match(transactionPattern);
        
        // Get the extracted values
        const payerName = payerMatch ? payerMatch[1].trim() : null;
        const amount = amountMatch ? amountMatch[1].trim() : null;
        const transactionNumber = transactionMatch ? transactionMatch[1].trim() : null;
        
        return {
            success: true,
            data: {
                payerName,
                amount,
                transactionNumber
            }
        };
    } catch (error) {
        console.error(`Error extracting data from PDF: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to download a file directly using Node.js https module
async function downloadFile(url, outputPath) {
    console.log(`Downloading file from ${url} to ${outputPath}...`);
    
    return new Promise((resolve, reject) => {
        // Create HTTPS request with options to ignore SSL errors
        const request = https.get(url, {
            rejectUnauthorized: false, // Ignore SSL certificate errors
            timeout: 30000 // 30 second timeout
        }, (response) => {
            // Check if the response is successful
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: HTTP status code ${response.statusCode}`));
                return;
            }
            
            // Get content type from headers
            const contentType = response.headers['content-type'];
            console.log(`Content-Type: ${contentType}`);
            
            // Create a write stream to save the file
            const fileStream = fs.createWriteStream(outputPath);
            
            // Pipe the response to the file
            response.pipe(fileStream);
            
            // Handle events
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`File downloaded successfully to ${outputPath}`);
                resolve({
                    success: true,
                    contentType: contentType,
                    path: outputPath
                });
            });
            
            fileStream.on('error', (err) => {
                // Clean up the file if there was an error
                fs.unlink(outputPath, () => {});
                reject(err);
            });
            
            // Log download progress
            let downloadedBytes = 0;
            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                if (downloadedBytes % 100000 === 0) { // Log every 100KB
                    console.log(`Downloaded ${downloadedBytes / 1024} KB...`);
                }
            });
        });
        
        // Handle request errors
        request.on('error', (err) => {
            reject(new Error(`Request error: ${err.message}`));
        });
        
        // Handle timeout
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timed out'));
        });
        
        // End the request
        request.end();
    });
}

async function scrapeReceipt() {
    const url = 'https://apps.cbe.com.et:100/?id=FT25186CS2K308680658';
    let browser = null;
    
    try {
        console.log('Starting receipt scraping process...');
        
        // First try direct download approach since we know it's a PDF
        console.log('Attempting direct download of the PDF file...');
        const outputPath = './cbe_receipt.pdf';
        
        try {
            const downloadResult = await downloadFile(url, outputPath);
            console.log('Direct download successful!');
            
            // Check file size to ensure it's a valid PDF
            const stats = await fs.promises.stat(outputPath);
            console.log(`File size: ${stats.size} bytes`);
            
            if (stats.size > 0) {
                // Read the first few bytes to check if it's a PDF
                const buffer = Buffer.alloc(5);
                const fd = await fs.promises.open(outputPath, 'r');
                await fd.read(buffer, 0, 5, 0);
                await fd.close();
                
                const fileSignature = buffer.toString();
                console.log(`File signature: ${fileSignature}`);
                
                if (fileSignature.includes('%PDF')) {
                    console.log('Valid PDF file detected');
                    
                    // Extract data from the PDF
                    console.log('Extracting data from the PDF...');
                    const extractionResult = await extractDataFromPDF(outputPath);
                    
                    if (extractionResult.success) {
                        console.log('Data extracted successfully');
                        return {
                            success: true,
                            message: 'PDF file downloaded and data extracted successfully',
                            filePath: outputPath,
                            fileSize: stats.size,
                            contentType: downloadResult.contentType,
                            data: extractionResult.data
                        };
                    } else {
                        console.log(`Failed to extract data: ${extractionResult.error}`);
                        return {
                            success: false,
                            message: `PDF file downloaded but data extraction failed: ${extractionResult.error}`,
                            filePath: outputPath,
                            fileSize: stats.size,
                            contentType: downloadResult.contentType
                        };
                    }
                } else {
                    console.log('Downloaded file is not a valid PDF');
                }
            }
        } catch (downloadError) {
            console.error(`Direct download failed: ${downloadError.message}`);
            console.log('Falling back to browser-based approach...');
        }
        
        // Launch a headless browser with minimal memory usage and improved stability
        browser = await puppeteer.launch({
            headless: 'new',  // Use the new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--js-flags=--expose-gc',
                '--disable-features=site-per-process',
                '--disable-extensions',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-pings',
                '--no-zygote',
                '--disable-web-security',  // Add this to handle cross-origin issues
                '--ignore-certificate-errors',  // Ignore SSL errors
                '--ignore-certificate-errors-spki-list',
                '--allow-insecure-localhost',
                '--disable-infobars',
                '--window-size=1280,800',
                '--enable-features=NetworkService',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            defaultViewport: { width: 1280, height: 800 },
            ignoreHTTPSErrors: true,  // Explicitly ignore HTTPS errors
            timeout: 60000  // Increase timeout to 60 seconds
        });
        
        console.log('Browser launched successfully');

        // Create a new page with improved error handling
        const page = await browser.newPage();
        console.log('New page created');
        
        // Configure page to use less memory and improve stability
        await page.setCacheEnabled(false);
        
        // Set default navigation timeout
        page.setDefaultNavigationTimeout(60000);
        
        // Set up request interception to handle potential issues and save PDF
        await page.setRequestInterception(true);
        
        // Track if we've found a PDF response
        let pdfFound = false;
        let pdfBuffer = null;
        
        // Handle responses to capture PDF content
        page.on('response', async (response) => {
            const status = response.status();
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            
            console.log(`Response: ${status} ${url} (${contentType})`);
            
            if (status >= 400) {
                console.log(`Response error ${status}: ${url}`);
            }
            
            // If this is a PDF response, try to save it
            if (contentType.includes('application/pdf') || 
                contentType.includes('binary/octet-stream') || 
                url.includes('.pdf')) {
                
                console.log('PDF response detected!');
                try {
                    const buffer = await response.buffer();
                    if (buffer && buffer.length > 0) {
                        pdfFound = true;
                        pdfBuffer = buffer;
                        console.log(`PDF content captured: ${buffer.length} bytes`);
                        
                        // Save the PDF
                        fs.writeFileSync('captured_response.pdf', buffer);
                        console.log('PDF saved to captured_response.pdf');
                    }
                } catch (bufferError) {
                    console.error(`Error capturing PDF: ${bufferError.message}`);
                }
            }
        });
        
        // Handle request interception
        page.on('request', (request) => {
            // Skip images, fonts, and stylesheets to reduce load
            const resourceType = request.resourceType();
            if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        // Handle console messages for debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        // Handle errors
        page.on('error', err => {
            console.error('Page error:', err.message);
        });
        
        page.on('pageerror', err => {
            console.error('Page error:', err.message);
        });
        
        console.log('Navigating to URL:', url);
        
        // Navigate to the URL with improved error handling
        let navigationAttempts = 0;
        const maxNavigationAttempts = 3;
        let navigationSuccessful = false;
        
        while (!navigationSuccessful && navigationAttempts < maxNavigationAttempts) {
            navigationAttempts++;
            console.log(`Navigation attempt ${navigationAttempts} of ${maxNavigationAttempts}...`);
            
            try {
                // Use a more reliable navigation strategy
                if (navigationAttempts === 1) {
                    console.log('Trying with domcontentloaded strategy...');
                    await page.goto(url, { 
                        waitUntil: 'domcontentloaded', 
                        timeout: 30000 
                    });
                } else if (navigationAttempts === 2) {
                    console.log('Trying with load strategy...');
                    await page.goto(url, { 
                        waitUntil: 'load', 
                        timeout: 40000 
                    });
                } else {
                    console.log('Trying with basic navigation strategy...');
                    await Promise.race([
                        page.goto(url, { timeout: 50000 }),
                        new Promise(resolve => setTimeout(resolve, 10000))
                    ]);
                    await page.waitForTimeout(5000);
                }
                
                navigationSuccessful = true;
                console.log('Navigation successful!');
            } catch (navigationError) {
                console.log(`Navigation attempt ${navigationAttempts} failed: ${navigationError.message}`);
                
                if (navigationError.message.includes('Navigating frame was detached')) {
                    console.log('Detected "Navigating frame was detached" error - special handling...');
                    
                    if (navigationAttempts < maxNavigationAttempts) {
                        console.log('Creating a new page to recover from detached frame...');
                        try {
                            await page.close().catch(e => console.log('Error closing page:', e.message));
                            page = await browser.newPage();
                            console.log('New page created successfully');
                            
                            // Reconfigure the new page
                            await page.setCacheEnabled(false);
                            page.setDefaultNavigationTimeout(60000);
                            
                            // Set up request interception again
                            await page.setRequestInterception(true);
                            page.on('request', (request) => {
                                const resourceType = request.resourceType();
                                if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
                                    request.abort();
                                } else {
                                    request.continue();
                                }
                            });
                            
                            // Handle console messages
                            page.on('console', msg => console.log('PAGE LOG:', msg.text()));
                        } catch (pageError) {
                            console.error('Error creating new page:', pageError.message);
                        }
                    }
                }
                
                if (!navigationSuccessful && navigationAttempts < maxNavigationAttempts) {
                    const waitTime = navigationAttempts * 2000;
                    console.log(`Waiting ${waitTime}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        if (!navigationSuccessful) {
            throw new Error(`Failed to navigate to ${url} after ${maxNavigationAttempts} attempts`);
        }
        
        // Take a screenshot to see what actually loaded
        await page.screenshot({ path: 'page-loaded.png' });
        console.log('Screenshot saved as page-loaded.png');
        
        // Check if we found a PDF during navigation
        if (pdfFound && pdfBuffer) {
            console.log('PDF was captured during navigation');
            return {
                success: true,
                message: 'PDF file captured during navigation',
                filePath: 'captured_response.pdf',
                fileSize: pdfBuffer.length
            };
        }
        
        // If we didn't capture a PDF but navigation was successful, the site might be returning something else
        console.log('Navigation successful but no PDF was captured');
        console.log('The site appears to be returning a different content type');
        
        return { 
            error: true, 
            message: 'Site is accessible but no PDF content was found',
            url: url,
            currentUrl: page.url()
        };
        
    } catch (error) {
        console.error(`Error scraping the receipt: ${error.message}`);
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: 'error-screenshot.png' });
                    console.log('Error screenshot saved as error-screenshot.png');
                }
            } catch (screenshotError) {
                console.error('Failed to take error screenshot:', screenshotError.message);
            }
        }
        return { 
            error: true, 
            message: error.message,
            url: url 
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed successfully');
        }
    }
}

// Main function to execute the scraper
async function main() {
    try {
        console.log('Starting CBE receipt scraper...');
        const result = await scrapeReceipt();
        console.log('\nScraping completed with result:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data) {
            console.log('\n✅ Success! Data extracted successfully:');
            console.log('Payer Name:', result.data.payerName);
            console.log('Amount:', result.data.amount, 'ETB');
            console.log('Transaction Number:', result.data.transactionNumber);
            console.log('\nPDF file saved to:', result.filePath);
            console.log('File size:', result.fileSize, 'bytes');
        } else if (result.success) {
            console.log('\n✅ Success! PDF file saved to:', result.filePath);
            console.log('File size:', result.fileSize, 'bytes');
        } else if (result.error) {
            console.log('\n❌ Error:', result.message);
        }
        
        return result;
    } catch (error) {
        console.error('\n❌ Unhandled error in main function:', error.message);
        return { error: true, message: error.message };
    }
}

// Execute the main function
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
