import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';

interface Campaign {
    _id: string;
    title?: string;
    campaignName?: string;
    description?: string;

    targetAmount?: number;
    goalAmount?: number;
    raisedAmount?: number;

    status?: string;
    approvalStatus?: string;
    isActive?: boolean;

    ngoId?: {
        _id?: string;
        ngoName?: string;
        email?: string;
    } | string;

    images?: string[];
    image?: string;
    imageUrl?: string;

    createdAt?: string;
    endDate?: string;
}

const CompanyCampaignListPage: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await apiFetch('/company/campaigns');

                console.log(
                    'Company campaigns response:',
                    response
                );

                let campaignList: Campaign[] = [];

                if (Array.isArray(response)) {
                    campaignList = response;
                } else if (Array.isArray(response?.campaigns)) {
                    campaignList = response.campaigns;
                } else if (Array.isArray(response?.data)) {
                    campaignList = response.data;
                } else if (
                    Array.isArray(response?.data?.campaigns)
                ) {
                    campaignList = response.data.campaigns;
                }

                // -----------------------------------------
                // FILTER BY NGO WHEN COMING FROM NGO LIST
                // -----------------------------------------

                const searchParams = new URLSearchParams(
                    location.search
                );

                const selectedNgoId =
                    searchParams.get('ngoId');

                if (selectedNgoId) {
                    console.log(
                        'Filtering campaigns for NGO:',
                        selectedNgoId
                    );

                    campaignList = campaignList.filter(
                        (campaign) => {
                            if (
                                typeof campaign.ngoId ===
                                'object' &&
                                campaign.ngoId !== null
                            ) {
                                return (
                                    campaign.ngoId._id ===
                                    selectedNgoId
                                );
                            }

                            return (
                                campaign.ngoId ===
                                selectedNgoId
                            );
                        }
                    );
                }

                setCampaigns(campaignList);
            } catch (error: any) {
                console.error(
                    'Failed to fetch company campaigns:',
                    error
                );

                addToast(
                    error?.message ||
                        'Failed to fetch campaigns',
                    'error'
                );

                setCampaigns([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [addToast, location.search]);

    // -----------------------------------------
    // DONATE NOW
    // -----------------------------------------

    const handleDonate = (campaignId: string) => {
        navigate(`/donate?campaign=${campaignId}`);
    };

    // -----------------------------------------
    // FILTER CAMPAIGNS
    // -----------------------------------------

    const filteredCampaigns = campaigns.filter(
        (campaign) => {
            if (filter === 'all') {
                return true;
            }

            const status =
                campaign.status ||
                campaign.approvalStatus ||
                '';

            return (
                status.toLowerCase() ===
                filter.toLowerCase()
            );
        }
    );

    // -----------------------------------------
    // LOADING
    // -----------------------------------------

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    // -----------------------------------------
    // PAGE
    // -----------------------------------------

    const searchParams = new URLSearchParams(
        location.search
    );

    const selectedNgoId =
        searchParams.get('ngoId');

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedNgoId
                            ? 'NGO Campaigns'
                            : 'Available Campaigns'}
                    </h1>

                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Support meaningful causes through our verified NGO partners
                    </p>
                </div>

                <select
                    value={filter}
                    onChange={(e) =>
                        setFilter(e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-brand-dark-200 dark:text-white"
                >
                    <option value="all">
                        All Campaigns
                    </option>

                    <option value="active">
                        Active
                    </option>

                    <option value="completed">
                        Completed
                    </option>
                </select>

            </div>

            {/* COUNT */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredCampaigns.length}{' '}
                campaign
                {filteredCampaigns.length !== 1
                    ? 's'
                    : ''}{' '}
                available
            </p>

            {/* CAMPAIGNS */}
            {filteredCampaigns.length > 0 ? (

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {filteredCampaigns.map(
                        (campaign) => {

                            const targetAmount =
                                Number(
                                    campaign.targetAmount ??
                                        campaign.goalAmount ??
                                        0
                                );

                            const raisedAmount =
                                Number(
                                    campaign.raisedAmount ??
                                        0
                                );

                            const percentage =
                                targetAmount > 0
                                    ? Math.min(
                                          (raisedAmount /
                                              targetAmount) *
                                              100,
                                          100
                                      )
                                    : 0;

                            const ngoName =
                                typeof campaign.ngoId ===
                                'object' &&
                                campaign.ngoId !== null
                                    ? campaign.ngoId?.ngoName
                                    : '';

                            const image =
                                campaign.images &&
                                campaign.images.length > 0
                                    ? campaign.images[0]
                                    : campaign.image ||
                                      campaign.imageUrl ||
                                      '';

                            const campaignTitle =
                                campaign.title ||
                                campaign.campaignName ||
                                'Untitled Campaign';

                            const campaignDescription =
                                campaign.description ||
                                'No description available.';

                            return (
                                <div
                                    key={campaign._id}
                                    className="bg-white dark:bg-brand-dark-200 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
                                >

                                    {/* IMAGE */}
                                    <div className="h-48 bg-gray-200 dark:bg-gray-700">

                                        {image ? (
                                            <img
                                                src={image}
                                                alt={
                                                    campaignTitle
                                                }
                                                className="w-full h-full object-cover"
                                                onError={(
                                                    e
                                                ) => {
                                                    e.currentTarget.style.display =
                                                        'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                No Image
                                            </div>
                                        )}

                                    </div>

                                    {/* CONTENT */}
                                    <div className="p-6 flex flex-col flex-grow">

                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            {campaignTitle}
                                        </h3>

                                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                                            {
                                                campaignDescription
                                            }
                                        </p>

                                        {/* PROGRESS */}
                                        <div className="mb-5">

                                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                <span>
                                                    Raised
                                                </span>

                                                <span>
                                                    {percentage.toFixed(
                                                        1
                                                    )}
                                                    %
                                                </span>
                                            </div>

                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">

                                                <div
                                                    className="bg-primary h-2 rounded-full"
                                                    style={{
                                                        width: `${percentage}%`
                                                    }}
                                                />

                                            </div>

                                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">

                                                <span>
                                                    ₹
                                                    {raisedAmount.toLocaleString(
                                                        'en-IN'
                                                    )}
                                                </span>

                                                <span>
                                                    ₹
                                                    {targetAmount.toLocaleString(
                                                        'en-IN'
                                                    )}
                                                </span>

                                            </div>

                                        </div>

                                        {/* NGO */}
                                        <div className="mb-5">

                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">
                                                    By:
                                                </span>{' '}
                                                {ngoName ||
                                                    'Verified NGO'}
                                            </p>

                                            {campaign.createdAt && (
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {new Date(
                                                        campaign.createdAt
                                                    ).toLocaleDateString(
                                                        'en-IN'
                                                    )}
                                                </p>
                                            )}

                                        </div>

                                        {/* DONATE NOW */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDonate(
                                                    campaign._id
                                                )
                                            }
                                            className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-gold text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                                        >
                                            <FiHeart
                                                size={18}
                                            />

                                            Donate Now
                                        </button>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </div>

            ) : (

                <div className="bg-white dark:bg-brand-dark-200 rounded-lg border border-gray-200 dark:border-gray-700 text-center py-16">

                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                        No campaigns found
                    </p>

                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                        {selectedNgoId
                            ? 'This NGO currently has no campaigns available.'
                            : 'There are currently no campaigns available.'}
                    </p>

                </div>

            )}

        </div>
    );
};

export default CompanyCampaignListPage;