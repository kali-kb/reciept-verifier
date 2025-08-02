# Receipt Verifier API

This API scrapes receipt information from CBE and Telebirr.

## Handling Monetary Values

When working with this API, it is important to understand how monetary values are handled. To ensure accuracy and avoid floating-point rounding errors, all amounts are stored as **integers in cents**.

For example, an amount of `123.45` will be stored as `12345`.

When you receive an amount from the API, you should divide it by 100 to get the original decimal value. When you send an amount to the API, you should multiply it by 100 and send it as an integer.