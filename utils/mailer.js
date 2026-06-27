const nodemailer = require('nodemailer');

// Define a placeholder variable for the transporter instance
let transporter;

// Helper function to guarantee environment variables are fully initialized
const getTransporter = () => {
  if (!transporter) {
    const user = process.env.SYSTEM_EMAIL_USER || process.env.EMAIL_USER;
    const pass = process.env.SYSTEM_EMAIL_PASSWORD || process.env.EMAIL_PASS;

    if (!user || !pass) {
      throw new Error('[SMTP Engine Failure] Environment credentials are missing or uninitialized.');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return transporter;
};

const sendOrderEmailNotifications = async (orderDocument, imageAttachmentPath = null) => {
  try {
    // 🌟 FIXED: Convert Mongoose hydrated documents into raw JS structures to prevent object mapping breaks
    const order = typeof orderDocument.toObject === 'function' ? orderDocument.toObject() : orderDocument;
    const { orderCode, customerDetails, items, subtotal, shippingCost, total, paymentMethod } = order;

    // Initialize the transporter safely at execution time
    const mailEngine = getTransporter();

    // 1. Safe Image Extraction & Base64 Fallback Engine
    const itemsHtml = (items || []).map(item => {
      let productImgSrc = item.image || item.imageUrl || ''; 
      
      if (productImgSrc && !productImgSrc.startsWith('http') && !productImgSrc.startsWith('data:image')) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const cleanPath = productImgSrc.startsWith('/') ? productImgSrc : `/${productImgSrc}`;
        productImgSrc = `${baseUrl}${cleanPath}`;
      }
      
      return `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; width: 60px;">
            ${productImgSrc ? `
              <img src="${productImgSrc}" alt="${item.name}" style="width: 50px; height: auto; border: 1px solid #eee; display: block; margin: 0 auto; border-radius: 2px;" />
            ` : `
              <span style="font-size: 10px; color: #999; display:block; text-align:center;">No Image</span>
            `}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #171717;">
            <strong>${item.name}</strong><br />
            <span style="color: #666; font-size: 11px; text-transform: uppercase;">
              Color: ${item.selectedColor || item.color || 'OS'} / Size: ${item.selectedSize || item.size || 'OS'}
            </span>
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #171717;" align="center">x${item.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; font-family: monospace; color: #171717;" align="right">E£${item.price}.00</td>
        </tr>
      `;
    }).join('');

    // 2. Core Invoice Template Design Layout
    const coreTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; background-color: #ffffff; padding: 20px; border: 1px solid #eee;">
        <h2 style="font-family: serif; border-bottom: 2px solid #000; padding-bottom: 15px; text-align: center; letter-spacing: 4px; margin-top: 0;">RADI ARCHIVE</h2>
        
        <p style="font-size: 13px; margin: 20px 0 5px 0;"><strong>Order Code Reference:</strong> ${orderCode}</p>
        <p style="font-size: 13px; margin: 0 0 20px 0;"><strong>Payment Choice:</strong> ${paymentMethod}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #fafafa; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd;">
              <th style="padding: 8px;">Image</th>
              <th style="padding: 8px; text-align: left;">Item Details</th>
              <th style="padding: 8px;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="width: 100%; max-width: 250px; margin-left: auto; font-size: 12px; line-height: 1.8; border-top: 1px solid #eee; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; color: #666;">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">E£${subtotal}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #666;">
            <span>Shipping:</span>
            <span style="font-family: monospace;">E£${shippingCost}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #000; border-top: 1px dashed #ddd; margin-top: 5px; padding-top: 5px;">
            <span>TOTAL:</span>
            <span style="font-family: monospace;">E£${total}.00</span>
          </div>
        </div>
      </div>
    `;

    // 3. Dynamic Fallback Safe Address Parser
    const shippingStreet = customerDetails.address || (customerDetails.shippingAddress && customerDetails.shippingAddress.address) || '';
    const shippingCity = customerDetails.city || (customerDetails.shippingAddress && customerDetails.shippingAddress.city) || '';
    const shippingGov = customerDetails.governorate || (customerDetails.shippingAddress && customerDetails.shippingAddress.governorate) || '';
    const shippingApartment = customerDetails.apartment || (customerDetails.shippingAddress && customerDetails.shippingAddress.apartment) || '';
    const shippingZip = customerDetails.postalCode || (customerDetails.shippingAddress && customerDetails.shippingAddress.postalCode) || '';

    const adminDetailsPanel = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #e5e5e5; color: #171717;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #000; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
          Fulfillment & Delivery Coordinates
        </h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="width: 120px; font-weight: bold; color: #666;">Customer Name:</td>
            <td>${customerDetails.firstName || ''} ${customerDetails.lastName || ''}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #666;">Phone Number:</td>
            <td><a href="tel:${customerDetails.phone}" style="color: #000; font-weight: bold; text-decoration: none;">${customerDetails.phone || ''}</a></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #666;">Email Address:</td>
            <td>${customerDetails.email || ''}</td>
          </tr>
          <tr style="vertical-align: top;">
            <td style="font-weight: bold; color: #666; padding-top: 5px;">Shipping Address:</td>
            <td style="padding-top: 5px; background: #fff; padding: 8px; border: 1px solid #eee; border-radius: 4px;">
              ${shippingStreet}<br />
              ${shippingApartment ? `Apartment/Suite: ${shippingApartment}<br />` : ''}
              City: ${shippingCity}<br />
              Governorate: <strong>${shippingGov}</strong>
              ${shippingZip ? `<br />Postal Code: ${shippingZip}` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;

    // Dispatch Order Success Confirmation Email to Customer
    await mailEngine.sendMail({
      from: `"RADI Archive Store" <${process.env.SYSTEM_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: customerDetails.email,
      subject: `Order Logged Successfully - ${orderCode}`,
      html: `
        <div style="background-color: #fafafa; padding: 20px;">
          <p style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; font-size: 14px;">
            Hello ${customerDetails.firstName || 'Client'},<br /><br />
            Your order has been placed successfully. Delivery cycles require approximately 2-3 weeks to clear local hubs.
          </p> 
          ${coreTemplate}
        </div>
      `
    });

    // Dispatch Real-time Dashboard Invoice to Fulfillment Admin Team
    await mailEngine.sendMail({
      from: `"Fulfillment Dispatch System" <${process.env.SYSTEM_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: 'Mariammrradi@gmail.com',
      subject: `⚠️ ACTION REQUIRED: New Order Invoice [${orderCode}]`,
      html: `
        <div style="background-color: #f4f4f4; padding: 20px;">
          <p style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; font-size: 14px; color: #dc2626; font-weight: bold;">
            A new checkout order has cleared validation. Please review customer details and inventory metrics below.
          </p> 
          ${adminDetailsPanel}
          ${coreTemplate}
        </div>
      `,
      attachments: imageAttachmentPath ? [{ filename: `receipt_${orderCode}.png`, path: imageAttachmentPath }] : []
    });

    console.log(`[SMTP Engine] Notifications processed cleanly for order: ${orderCode}`);
  } catch (error) {
    console.error('[SMTP Engine Failure] Could not route mail messages:', error.message);
  }
};

module.exports = { sendOrderEmailNotifications };