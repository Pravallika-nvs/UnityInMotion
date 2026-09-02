import React, { useState, useEffect, useMemo, useContext } from 'react';
import SectionWrapper from '../components/SectionWrapper.tsx';
import { getPublicCampaigns, paymentAPI } from '../services/api.ts';
import type { Campaign } from '../types.ts';
import Button from '../components/Button.tsx';
import { FiCreditCard, FiHeart, FiCheckCircle } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext.tsx';
import { AuthContext } from '../context/AuthContext.tsx';

declare var Razorpay: any;

const DonatePage: React.FC = () => {
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [claim80G, setClaim80G] = useState(true);
  const [panNumber, setPanNumber] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donorInfo, setDonorInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const location = useLocation();
  const { addToast } = useToast();
  const { user } = useContext(AuthContext);

  // ============================================================
  // LOAD CAMPAIGNS
  // ============================================================
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const allCampaigns = await getPublicCampaigns();

        const activeCampaigns = allCampaigns.filter(
          (c) => c.status === 'active'
        );

        setCampaigns(activeCampaigns);

        const queryParams = new URLSearchParams(location.search);
        const campaignIdFromQuery = queryParams.get('campaign');

        if (
          campaignIdFromQuery &&
          activeCampaigns.some((c) => c._id === campaignIdFromQuery)
        ) {
          setSelectedCampaignId(campaignIdFromQuery);
        } else if (activeCampaigns.length > 0) {
          setSelectedCampaignId(activeCampaigns[0]._id);
        } else {
          setSelectedCampaignId('general');
        }
      } catch (error) {
        console.error('Failed to load campaigns:', error);
        addToast('Failed to load campaigns.', 'error');
      }
    };

    fetchCampaigns();
  }, [location.search, addToast]);

  // ============================================================
  // SELECTED CAMPAIGN
  // ============================================================
  const selectedCampaign = useMemo(() => {
    return campaigns.find(
      (campaign) => campaign._id === selectedCampaignId
    );
  }, [campaigns, selectedCampaignId]);

  // ============================================================
  // AMOUNT HANDLERS
  // ============================================================
  const handleAmountClick = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    setCustomAmount(value);

    if (value === '') {
      setAmount(0);
      return;
    }

    const numericValue = Number(value);

    if (!isNaN(numericValue)) {
      setAmount(numericValue);
    }
  };

  // ============================================================
  // DONOR INFO
  // ============================================================
  const handleDonorInfoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setDonorInfo((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // DONATION SUBMIT
  // ============================================================
  const handleDonationSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (amount < 1) {
      addToast('Please enter a valid donation amount.', 'error');
      return;
    }

    if (!selectedCampaignId) {
      addToast('Please select a campaign.', 'error');
      return;
    }

    if (claim80G && !panNumber.trim()) {
      addToast('Please enter your PAN number for the 80G benefit.', 'error');
      return;
    }

    setLoading(true);

    try {
      const donorName = user?.fullName || donorInfo.name;
      const donorEmail = user?.email || donorInfo.email;
      const donorPhone = user?.phoneNumber || donorInfo.phone;

      if (!donorName || !donorEmail || !donorPhone) {
        addToast(
          'Please provide your name, email and phone number.',
          'error'
        );
        setLoading(false);
        return;
      }

      // ========================================================
      // CREATE PAYMENT ORDER
      // ========================================================
      const orderPayload = {
        campaignId:
          selectedCampaignId === 'general'
            ? null
            : selectedCampaignId,

        amount,

        donorName,
        donorEmail,
        donorPhone,

        paymentMethod: 'razorpay',

        isAnonymous,

        claim80G,

        panNumber: claim80G ? panNumber.trim() : '',
      };

      console.log('Creating donation order:', orderPayload);

      const orderData = await paymentAPI.createOrder(orderPayload);

      console.log('Create order response:', orderData);

      /*
       * Backend createSuccessResponse() returns fields at the
       * top level. However, we support both possible structures
       * so the frontend does not break if the backend returns
       * { data: { order } }.
       */
      const order = orderData?.order || orderData?.data?.order;

      const donation =
        orderData?.donation || orderData?.data?.donation;

      const campaign =
        orderData?.campaign || orderData?.data?.campaign;

      if (!order) {
        console.error(
          'Payment order missing from response:',
          orderData
        );

        throw new Error(
          orderData?.message ||
            'Payment order was not returned by the server.'
        );
      }

      if (!order.id) {
        throw new Error(
          'Payment order ID was not returned by the server.'
        );
      }

      // ========================================================
      // RAZORPAY
      // ========================================================
      if (typeof Razorpay === 'undefined') {
        throw new Error(
          'Razorpay is not loaded. Please refresh the page and try again.'
        );
      }

      const razorpayKey =
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        'rzp_test_1DP5mmOlF5G5ag';

      const rzpOptions = {
        key: razorpayKey,

        amount: order.amount,

        currency: order.currency || 'INR',

        name: 'DonationHub',

        description:
          campaign?.name ||
          campaign?.title ||
          selectedCampaign?.title ||
          'Donation',

        order_id: order.id,

        handler: async (response: any) => {
          try {
            console.log(
              'Razorpay payment response:',
              response
            );

            const verificationData = {
              razorpay_order_id:
                response.razorpay_order_id,

              razorpay_payment_id:
                response.razorpay_payment_id,

              razorpay_signature:
                response.razorpay_signature,

              donationId: donation?.id || donation?._id,
            };

            console.log(
              'Verifying payment:',
              verificationData
            );

            const verificationResult =
              await paymentAPI.verifyPayment(
                verificationData
              );

            console.log(
              'Payment verification response:',
              verificationResult
            );

            if (verificationResult?.success) {
              addToast(
                'Payment completed successfully!',
                'success'
              );

              setDonationSuccess(true);

              if (!user && donorInfo.email) {
                addToast(
                  `Donation successful! A confirmation has been sent to ${donorInfo.email}.`,
                  'success'
                );
              }
            } else {
              throw new Error(
                verificationResult?.message ||
                  'Payment verification failed.'
              );
            }
          } catch (verifyError: any) {
            console.error(
              'Payment verification error:',
              verifyError
            );

            addToast(
              verifyError?.message ||
                'Payment verification failed.',
              'error'
            );
          }
        },

        prefill: {
          name: donorName,
          email: donorEmail,
          contact: donorPhone,
        },

        theme: {
          color: '#003f5c',
        },

        modal: {
          ondismiss: () => {
            addToast(
              'Payment cancelled.',
              'info'
            );
          },
        },
      };

      console.log(
        'Opening Razorpay with options:',
        {
          orderId: rzpOptions.order_id,
          amount: rzpOptions.amount,
          currency: rzpOptions.currency,
        }
      );

      const rzp = new Razorpay(rzpOptions);

      rzp.open();
    } catch (err: any) {
      console.error(
        'Donation error:',
        err
      );

      addToast(
        err?.message ||
          'Donation failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FEE CALCULATION
  // ============================================================
  const platformFee = Math.round(amount * 0.05);
  const gstOnFee = Math.round(platformFee * 0.18);

  const totalDeduction =
    platformFee + gstOnFee;

  const amountToNgo = Math.max(
    amount - totalDeduction,
    0
  );

  // ============================================================
  // SUCCESS SCREEN
  // ============================================================
  if (donationSuccess) {
    return (
      <div className="bg-warm-gray dark:bg-brand-dark font-sans min-h-screen flex items-center justify-center py-16">
        <SectionWrapper className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white dark:bg-brand-dark-200 p-8 md:p-12 rounded-xl shadow-2xl">
            <FiCheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />

            <h1 className="text-3xl font-extrabold text-navy-blue dark:text-white font-serif">
              Thank You for Your Donation!
            </h1>

            <p className="mt-4 text-lg text-warm-gray-600 dark:text-gray-300">
              Your generosity is making a real difference.
              A confirmation receipt has been sent to your email.
            </p>

            <div className="mt-8">
              <Button to="/explore">
                Explore More Campaigns
              </Button>
            </div>
          </div>
        </SectionWrapper>
      </div>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================
  return (
    <div className="bg-warm-gray dark:bg-brand-dark font-sans min-h-screen py-16">
      <SectionWrapper className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-navy-blue dark:text-white font-serif">
            Make a Donation
          </h1>

          <p className="mt-4 text-lg text-warm-gray-600 dark:text-gray-300">
            Your contribution can change lives. Thank you for your generosity.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">

          {/* ==================================================
              LEFT COLUMN
          ================================================== */}
          <div className="bg-white dark:bg-brand-dark-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-8 md:p-10">

              <form
                onSubmit={handleDonationSubmit}
                className="space-y-8"
              >

                {/* Guest Donor Information */}
                {!user && (
                  <div>
                    <label className="block text-lg font-semibold text-navy-blue dark:text-white mb-3">
                      Donor Information
                    </label>

                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={donorInfo.name}
                      onChange={handleDonorInfoChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold mb-3"
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={donorInfo.email}
                      onChange={handleDonorInfoChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold mb-3"
                    />

                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      value={donorInfo.phone}
                      onChange={handleDonorInfoChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />
                  </div>
                )}

                {/* Campaign */}
                <div>
                  <label
                    htmlFor="campaign"
                    className="block text-lg font-semibold text-navy-blue dark:text-white mb-2"
                  >
                    1. Choose a Campaign
                  </label>

                  <select
                    id="campaign"
                    name="campaign"
                    value={selectedCampaignId}
                    onChange={(e) =>
                      setSelectedCampaignId(e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  >
                    {campaigns.length === 0 && (
                      <option value="">
                        Loading campaigns...
                      </option>
                    )}

                    {campaigns.map((campaign) => (
                      <option
                        key={campaign._id}
                        value={campaign._id}
                      >
                        {campaign.title}
                      </option>
                    ))}

                    <option value="general">
                      Donate to General Fund
                    </option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-lg font-semibold text-navy-blue dark:text-white mb-2">
                    2. Select an Amount (INR)
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[500, 1000, 2500, 5000].map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          onClick={() =>
                            handleAmountClick(value)
                          }
                          className={`p-4 rounded-md text-center font-bold border-2 transition-colors ${
                            amount === value &&
                            customAmount === ''
                              ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                              : 'bg-gray-100 dark:bg-brand-dark border-transparent hover:border-brand-gold'
                          }`}
                        >
                          ₹{value.toLocaleString()}
                        </button>
                      )
                    )}
                  </div>

                  <input
                    type="number"
                    min="1"
                    placeholder="Or enter a custom amount"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="mt-4 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                </div>

                {/* Preferences */}
                <div>
                  <label className="block text-lg font-semibold text-navy-blue dark:text-white mb-2">
                    3. Your Preferences
                  </label>

                  <div className="space-y-3">

                    {/* 80G */}
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-brand-dark p-3 rounded-md">
                      <input
                        id="claim80g"
                        name="claim80g"
                        type="checkbox"
                        checked={claim80G}
                        onChange={(e) =>
                          setClaim80G(e.target.checked)
                        }
                        className="h-4 w-4 text-brand-gold focus:ring-brand-gold border-gray-300 dark:border-gray-600 rounded"
                      />

                      <label
                        htmlFor="claim80g"
                        className="text-sm text-warm-gray-700 dark:text-gray-300"
                      >
                        I want to claim 80G tax benefit (requires PAN).
                      </label>
                    </div>

                    {claim80G && (
                      <input
                        type="text"
                        placeholder="PAN Number"
                        value={panNumber}
                        onChange={(e) =>
                          setPanNumber(e.target.value.toUpperCase())
                        }
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      />
                    )}

                    {/* Anonymous */}
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-brand-dark p-3 rounded-md">
                      <input
                        id="isAnonymous"
                        name="isAnonymous"
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) =>
                          setIsAnonymous(e.target.checked)
                        }
                        className="h-4 w-4 text-brand-gold focus:ring-brand-gold border-gray-300 dark:border-gray-600 rounded"
                      />

                      <label
                        htmlFor="isAnonymous"
                        className="text-sm text-warm-gray-700 dark:text-gray-300"
                      >
                        Make my donation anonymous.
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="text-center pt-4">
                  <Button
                    type="submit"
                    className="w-full md:w-auto text-lg"
                    disabled={loading || amount < 1}
                  >
                    <FiCreditCard className="mr-2" />

                    {loading
                      ? 'Processing...'
                      : `Donate ₹${amount.toLocaleString()}`}
                  </Button>
                </div>

              </form>
            </div>
          </div>

          {/* ==================================================
              RIGHT COLUMN
          ================================================== */}
          <div className="space-y-6">

            {/* Campaign Summary */}
            <div className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold text-lg text-navy-blue dark:text-white mb-4 border-b dark:border-gray-700 pb-2">
                Donation Summary
              </h3>

              {selectedCampaign ? (
                <div className="flex items-center gap-4">
                  <img
                    src={selectedCampaign.thumbnail}
                    alt={selectedCampaign.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />

                  <div>
                    <p className="font-bold text-navy-blue dark:text-white">
                      {selectedCampaign.title}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {selectedCampaign.organizer || 'DonationHub'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-brand-dark flex items-center justify-center">
                    <FiHeart className="h-8 w-8 text-gray-400" />
                  </div>

                  <div>
                    <p className="font-bold text-navy-blue dark:text-white">
                      General Fund
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supports platform operations
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            <div className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-lg">
              <h4 className="font-semibold text-lg text-navy-blue dark:text-white mb-4">
                Transparent Fee Breakdown
              </h4>

              <div className="text-sm text-warm-gray-700 dark:text-gray-300 mt-2 space-y-2">

                <div className="flex justify-between">
                  <span>Your Donation:</span>
                  <span>
                    ₹{amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between border-b dark:border-gray-600 pb-2">
                  <span>Platform Fee (5%):</span>
                  <span>
                    - ₹{platformFee.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-warm-gray-500 dark:text-gray-400 pt-1">
                  <span>GST on Fee (18%):</span>
                  <span>
                    - ₹{gstOnFee.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-navy-blue dark:text-white pt-2 text-base border-t dark:border-gray-600 mt-2">
                  <span>
                    Amount reaching the cause:
                  </span>

                  <span>
                    ₹{amountToNgo.toLocaleString()}
                  </span>
                </div>

              </div>

              <p className="text-xs text-gray-400 mt-4">
                This small fee helps us maintain the platform,
                ensure security, and verify every campaign for
                your trust.
              </p>
            </div>

          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default DonatePage;