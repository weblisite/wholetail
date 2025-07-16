const express = require('express');
const { supabase } = require('../config/database');
const router = express.Router();

// Mock data for development
const mockLoans = [
  {
    id: 'loan-1',
    borrower_id: 'retailer-123',
    lender_id: 'financier-1',
    amount: 50000,
    interest_rate: 12.5,
    term_months: 6,
    status: 'active',
    purpose: 'Inventory purchase',
    confidence_score: 75,
    disbursed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    amount_paid: 12000,
    amount_remaining: 38000,
    next_payment_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    monthly_payment: 9000,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    borrower: {
      name: 'John Doe',
      business_name: 'Doe Retail Store',
      phone: '+254701234567',
      location: 'Nairobi',
      business_registration: 'BR123456789'
    }
  },
  {
    id: 'loan-2',
    borrower_id: 'retailer-456',
    lender_id: 'financier-1',
    amount: 75000,
    interest_rate: 15.0,
    term_months: 12,
    status: 'pending',
    purpose: 'Business expansion',
    confidence_score: 62,
    disbursed_at: null,
    due_date: null,
    amount_paid: 0,
    amount_remaining: 75000,
    next_payment_date: null,
    monthly_payment: 7200,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    borrower: {
      name: 'Jane Smith',
      business_name: 'Smith Supplies',
      phone: '+254709876543',
      location: 'Mombasa',
      business_registration: 'BR987654321'
    }
  },
  {
    id: 'loan-3',
    borrower_id: 'retailer-789',
    lender_id: 'financier-1',
    amount: 30000,
    interest_rate: 10.0,
    term_months: 4,
    status: 'completed',
    purpose: 'Equipment purchase',
    confidence_score: 88,
    disbursed_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    amount_paid: 32000,
    amount_remaining: 0,
    next_payment_date: null,
    monthly_payment: 8000,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    borrower: {
      name: 'Peter Wilson',
      business_name: 'Wilson Groceries',
      phone: '+254712345678',
      location: 'Kisumu',
      business_registration: 'BR456789123'
    }
  }
];

const mockConfidenceFactors = {
  'retailer-123': {
    purchase_volume_score: 72, // 50% weight
    repayment_history_score: 80, // 40% weight
    platform_activity_score: 65, // 10% weight
    overall_score: 75,
    risk_level: 'medium',
    purchase_volume: 150000,
    total_orders: 25,
    days_on_platform: 180,
    successful_payments: 18,
    late_payments: 2,
    defaulted_payments: 0
  },
  'retailer-456': {
    purchase_volume_score: 58,
    repayment_history_score: 45,
    platform_activity_score: 70,
    overall_score: 62,
    risk_level: 'high',
    purchase_volume: 80000,
    total_orders: 12,
    days_on_platform: 90,
    successful_payments: 8,
    late_payments: 3,
    defaulted_payments: 1
  },
  'retailer-789': {
    purchase_volume_score: 85,
    repayment_history_score: 95,
    platform_activity_score: 80,
    overall_score: 88,
    risk_level: 'low',
    purchase_volume: 200000,
    total_orders: 45,
    days_on_platform: 365,
    successful_payments: 30,
    late_payments: 0,
    defaulted_payments: 0
  }
};

// Get all loans for a financier
router.get('/loans/:financierId', async (req, res) => {
  try {
    const { financierId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock loans data for development');
      
      let filteredLoans = mockLoans.filter(loan => loan.lender_id === financierId);
      
      if (status) {
        filteredLoans = filteredLoans.filter(loan => loan.status === status);
      }
      
      return res.json({ loans: filteredLoans });
    }

    // Real Supabase implementation would go here
    res.json({ loans: [] });
  } catch (error) {
    console.error('Loans fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get loan portfolio summary
router.get('/portfolio/:financierId', async (req, res) => {
  try {
    const { financierId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock portfolio data for development');
      
      const financierLoans = mockLoans.filter(loan => loan.lender_id === financierId);
      
      const summary = {
        total_loans: financierLoans.length,
        total_amount_disbursed: financierLoans.reduce((sum, loan) => 
          loan.status !== 'pending' ? sum + loan.amount : sum, 0
        ),
        total_outstanding: financierLoans.reduce((sum, loan) => 
          sum + loan.amount_remaining, 0
        ),
        total_collected: financierLoans.reduce((sum, loan) => 
          sum + loan.amount_paid, 0
        ),
        active_loans: financierLoans.filter(loan => loan.status === 'active').length,
        pending_loans: financierLoans.filter(loan => loan.status === 'pending').length,
        completed_loans: financierLoans.filter(loan => loan.status === 'completed').length,
        defaulted_loans: financierLoans.filter(loan => loan.status === 'defaulted').length,
        average_confidence_score: Math.round(
          financierLoans.reduce((sum, loan) => sum + loan.confidence_score, 0) / financierLoans.length
        ),
        monthly_collections: 28000, // Mock calculation
        expected_returns: 45000 // Mock calculation
      };
      
      return res.json({ portfolio: summary });
    }

    // Real Supabase implementation would go here
    res.json({ portfolio: {} });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get confidence score for a retailer
router.get('/confidence/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock confidence score data for development');
      
      const confidenceData = mockConfidenceFactors[retailerId];
      if (!confidenceData) {
        return res.status(404).json({ error: 'Retailer not found' });
      }
      
      return res.json({ confidence: confidenceData });
    }

    // Real Supabase implementation would calculate confidence score
    res.json({ confidence: {} });
  } catch (error) {
    console.error('Confidence score fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new loan
router.post('/loans', async (req, res) => {
  try {
    const { 
      borrower_id, 
      lender_id, 
      amount, 
      interest_rate, 
      term_months, 
      purpose 
    } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Creating mock loan for development');
      
      // Calculate confidence score for the borrower
      const confidenceData = mockConfidenceFactors[borrower_id];
      const confidence_score = confidenceData ? confidenceData.overall_score : 50;
      
      const newLoan = {
        id: `loan-${Date.now()}`,
        borrower_id,
        lender_id,
        amount: parseFloat(amount),
        interest_rate: parseFloat(interest_rate),
        term_months: parseInt(term_months),
        status: 'pending',
        purpose,
        confidence_score,
        disbursed_at: null,
        due_date: null,
        amount_paid: 0,
        amount_remaining: parseFloat(amount),
        next_payment_date: null,
        monthly_payment: Math.round((parseFloat(amount) * (1 + parseFloat(interest_rate)/100)) / parseInt(term_months)),
        created_at: new Date().toISOString(),
        borrower: {
          name: 'New Borrower',
          business_name: 'New Business',
          phone: '+254700000000',
          location: 'Nairobi',
          business_registration: 'BR000000000'
        }
      };
      
      mockLoans.push(newLoan);
      return res.status(201).json({ message: 'Loan created successfully', loan: newLoan });
    }

    // Real Supabase implementation would go here
    res.status(201).json({ message: 'Loan created successfully' });
  } catch (error) {
    console.error('Loan creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update loan status
router.patch('/loans/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Updating mock loan status for development');
      
      const loanIndex = mockLoans.findIndex(loan => loan.id === id);
      if (loanIndex === -1) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      mockLoans[loanIndex].status = status;
      
      // If approving loan, set disbursement date and due date
      if (status === 'active') {
        mockLoans[loanIndex].disbursed_at = new Date().toISOString();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + mockLoans[loanIndex].term_months);
        mockLoans[loanIndex].due_date = dueDate.toISOString();
        
        const nextPayment = new Date();
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        mockLoans[loanIndex].next_payment_date = nextPayment.toISOString();
      }
      
      return res.json({ 
        message: 'Loan status updated successfully', 
        loan: mockLoans[loanIndex] 
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Loan status updated successfully' });
  } catch (error) {
    console.error('Loan status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all retailer applications for financing
router.get('/applications', async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock applications data for development');
      
      let applications = mockLoans.filter(loan => loan.status === 'pending');
      
      // Add confidence scores to applications
      applications = applications.map(loan => ({
        ...loan,
        confidence: mockConfidenceFactors[loan.borrower_id] || {}
      }));
      
      return res.json({ applications });
    }

    // Real Supabase implementation would go here
    res.json({ applications: [] });
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active loans for a retailer
router.get('/retailer-loans/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock retailer loans data for development');
      
      const retailerLoans = mockLoans.filter(loan => 
        loan.borrower_id === retailerId && loan.status === 'active'
      );
      
      return res.json({ loans: retailerLoans });
    }

    // Real Supabase implementation would go here
    res.json({ loans: [] });
  } catch (error) {
    console.error('Retailer loans fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Make manual loan payment
router.post('/loans/:loanId/payment', async (req, res) => {
  try {
    const { loanId } = req.params;
    const { amount, payment_method = 'mpesa' } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Processing mock loan payment for development');
      
      const loanIndex = mockLoans.findIndex(loan => loan.id === loanId);
      if (loanIndex === -1) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      const loan = mockLoans[loanIndex];
      const paymentAmount = parseFloat(amount);
      
      // Validate payment amount
      if (paymentAmount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount' });
      }
      
      if (paymentAmount > loan.amount_remaining) {
        return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
      }
      
      // Update loan
      mockLoans[loanIndex].amount_paid += paymentAmount;
      mockLoans[loanIndex].amount_remaining -= paymentAmount;
      
      // Update next payment date
      if (mockLoans[loanIndex].amount_remaining > 0) {
        const nextPayment = new Date();
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        mockLoans[loanIndex].next_payment_date = nextPayment.toISOString();
      } else {
        // Loan is fully paid
        mockLoans[loanIndex].status = 'completed';
        mockLoans[loanIndex].next_payment_date = null;
      }
      
      // Create payment record
      const paymentRecord = {
        id: `payment-${Date.now()}`,
        loan_id: loanId,
        amount: paymentAmount,
        payment_method,
        payment_type: 'manual',
        created_at: new Date().toISOString(),
        status: 'completed'
      };
      
      return res.json({ 
        message: 'Payment processed successfully', 
        payment: paymentRecord,
        loan: mockLoans[loanIndex]
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Loan payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check loan eligibility for new orders (used during order creation)
router.get('/eligibility/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Checking loan eligibility for development');
      
      const activeLoans = mockLoans.filter(loan => 
        loan.borrower_id === retailerId && loan.status === 'active'
      );
      
      const hasActiveLoans = activeLoans.length > 0;
      const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.amount_remaining, 0);
      
      // Calculate suggested collection amount (minimum payment or 10% of outstanding)
      let suggestedCollectionAmount = 0;
      if (hasActiveLoans) {
        const totalMonthlyPayments = activeLoans.reduce((sum, loan) => sum + loan.monthly_payment, 0);
        const tenPercentOfOutstanding = totalOutstanding * 0.1;
        suggestedCollectionAmount = Math.min(totalMonthlyPayments * 0.5, tenPercentOfOutstanding);
      }
      
      return res.json({ 
        eligible_for_new_loans: !hasActiveLoans,
        has_active_loans: hasActiveLoans,
        active_loans_count: activeLoans.length,
        total_outstanding: totalOutstanding,
        suggested_collection_amount: Math.round(suggestedCollectionAmount),
        active_loans: activeLoans
      });
    }

    // Real Supabase implementation would go here
    res.json({ eligible_for_new_loans: true, has_active_loans: false });
  } catch (error) {
    console.error('Loan eligibility check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process loan collection from order
router.post('/loans/collect-from-order', async (req, res) => {
  try {
    const { retailer_id, order_id, collection_amount } = req.body;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Processing loan collection from order for development');
      
      const activeLoans = mockLoans.filter(loan => 
        loan.borrower_id === retailer_id && loan.status === 'active'
      );
      
      if (activeLoans.length === 0) {
        return res.status(400).json({ error: 'No active loans found' });
      }
      
      let remainingAmount = parseFloat(collection_amount);
      const payments = [];
      
      // Distribute payment across active loans (oldest first)
      for (const loan of activeLoans.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
        if (remainingAmount <= 0) break;
        
        const loanIndex = mockLoans.findIndex(l => l.id === loan.id);
        const paymentAmount = Math.min(remainingAmount, loan.amount_remaining);
        
        // Update loan
        mockLoans[loanIndex].amount_paid += paymentAmount;
        mockLoans[loanIndex].amount_remaining -= paymentAmount;
        
        if (mockLoans[loanIndex].amount_remaining <= 0) {
          mockLoans[loanIndex].status = 'completed';
          mockLoans[loanIndex].next_payment_date = null;
        }
        
        // Create payment record
        payments.push({
          id: `payment-${Date.now()}-${loan.id}`,
          loan_id: loan.id,
          amount: paymentAmount,
          payment_method: 'order_collection',
          payment_type: 'automatic',
          order_id: order_id,
          created_at: new Date().toISOString(),
          status: 'completed'
        });
        
        remainingAmount -= paymentAmount;
      }
      
      return res.json({ 
        message: 'Loan collection processed successfully', 
        payments,
        total_collected: parseFloat(collection_amount)
      });
    }

    // Real Supabase implementation would go here
    res.json({ message: 'Loan collection processed successfully' });
  } catch (error) {
    console.error('Loan collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get retailer credit profile with available credit lines
router.get('/credit-profile/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Check if using mock data
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
      console.log('Using mock credit profile data for development');
      
      // Get retailer's confidence factors
      const confidenceData = mockConfidenceFactors[retailerId] || {
        purchase_volume_score: 65,
        repayment_history_score: 70,
        platform_activity_score: 60,
        overall_score: 67,
        risk_level: 'medium',
        purchase_volume: 120000,
        total_orders: 15,
        days_on_platform: 120,
        successful_payments: 12,
        late_payments: 2,
        defaulted_payments: 0
      };

      // Get retailer's loan history
      const retailerLoans = mockLoans.filter(loan => loan.borrower_id === retailerId);
      const completedLoans = retailerLoans.filter(loan => loan.status === 'completed');
      const activeLoans = retailerLoans.filter(loan => loan.status === 'active');
      
      // Calculate credit metrics
      const totalRepaidLoans = completedLoans.length;
      const averageRepaymentDays = completedLoans.length > 0 
        ? Math.round(completedLoans.reduce((sum, loan) => {
            const daysToRepay = Math.ceil((new Date(loan.due_date) - new Date(loan.disbursed_at)) / (1000 * 60 * 60 * 24));
            return sum + daysToRepay;
          }, 0) / completedLoans.length)
        : 0;
      
      const defaultRate = retailerLoans.length > 0 
        ? (retailerLoans.filter(loan => loan.status === 'defaulted').length / retailerLoans.length) * 100
        : 0;
      
      const totalCreditUtilized = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
      const creditHistoryMonths = confidenceData.days_on_platform > 0 
        ? Math.floor(confidenceData.days_on_platform / 30)
        : 0;

      // Mock available credit lines from different financiers
      const availableCreditLines = [
        {
          id: 'cl-1',
          financier_name: 'Sarah Mwangi',
          financier_company: 'Kilimo Finance Ltd',
          available_amount: 1200000,
          interest_rate: 18.5,
          repayment_period_days: 90,
          confidence_score_required: 85,
          approval_time_hours: 2,
          terms: ['No collateral required', 'Flexible repayment', 'Grace period available'],
          rating: 4.9,
          total_disbursed: 25800000,
          success_rate: 96.4
        },
        {
          id: 'cl-2',
          financier_name: 'James Kiprotich',
          financier_company: 'AgriCredit Solutions',
          available_amount: 800000,
          interest_rate: 16.2,
          repayment_period_days: 60,
          confidence_score_required: 80,
          approval_time_hours: 1,
          terms: ['Quick approval', 'Low interest rate', 'Business growth focus'],
          rating: 4.7,
          total_disbursed: 18500000,
          success_rate: 94.1
        },
        {
          id: 'cl-3',
          financier_name: 'Grace Wanjiku',
          financier_company: 'SmartLend Capital',
          available_amount: 500000,
          interest_rate: 20.1,
          repayment_period_days: 45,
          confidence_score_required: 75,
          approval_time_hours: 0.5,
          terms: ['Instant approval', 'Short term', 'Emergency funding'],
          rating: 4.5,
          total_disbursed: 12300000,
          success_rate: 91.8
        },
        {
          id: 'cl-4',
          financier_name: 'Michael Otieno',
          financier_company: 'Trade Finance Partners',
          available_amount: 300000,
          interest_rate: 19.5,
          repayment_period_days: 30,
          confidence_score_required: 70,
          approval_time_hours: 4,
          terms: ['Small business focused', 'Quick turnaround', 'Competitive rates'],
          rating: 4.3,
          total_disbursed: 8900000,
          success_rate: 89.6
        }
      ];

      // Filter credit lines based on retailer's confidence score
      const eligibleCreditLines = availableCreditLines.filter(
        line => confidenceData.overall_score >= line.confidence_score_required
      );

      // Determine credit rating
      let creditRating = 'Poor';
      if (confidenceData.overall_score >= 90) creditRating = 'Excellent';
      else if (confidenceData.overall_score >= 80) creditRating = 'Good';
      else if (confidenceData.overall_score >= 70) creditRating = 'Fair';

      // Find recommended credit line (best terms for the retailer)
      const recommendedCreditLine = eligibleCreditLines.length > 0
        ? eligibleCreditLines.sort((a, b) => {
            // Prioritize by success rate and lower interest rate
            const scoreA = (a.success_rate * 0.6) + ((25 - a.interest_rate) * 2);
            const scoreB = (b.success_rate * 0.6) + ((25 - b.interest_rate) * 2);
            return scoreB - scoreA;
          })[0]
        : null;

      const creditProfile = {
        current_confidence_score: confidenceData.overall_score,
        credit_history_months: creditHistoryMonths,
        total_repaid_loans: totalRepaidLoans,
        average_repayment_days: averageRepaymentDays,
        default_rate: defaultRate,
        credit_utilization: totalCreditUtilized > 0 ? Math.round((totalCreditUtilized / 2000000) * 100) : 0, // Assume 2M credit limit
        available_credit_lines: eligibleCreditLines,
        total_available_credit: eligibleCreditLines.reduce((sum, line) => sum + line.available_amount, 0),
        recommended_credit_line: recommendedCreditLine,
        credit_rating: creditRating,
        qualification_factors: {
          confidence_score: confidenceData.overall_score >= 70,
          business_history: creditHistoryMonths >= 6,
          repayment_history: defaultRate <= 5,
          current_outstanding: totalCreditUtilized < 1000000
        }
      };
      
      return res.json(creditProfile);
    }

    // Real Supabase implementation would go here
    res.json({ 
      current_confidence_score: 0,
      available_credit_lines: [],
      total_available_credit: 0
    });
  } catch (error) {
    console.error('Credit profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 