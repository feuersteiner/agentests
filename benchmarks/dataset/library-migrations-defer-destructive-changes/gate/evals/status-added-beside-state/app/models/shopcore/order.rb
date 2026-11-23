module Shopcore
  class Order < ActiveRecord::Base
    STATUSES = %w[cart placed paid shipped cancelled].freeze

    belongs_to :user, class_name: "::User"

    validates :number, presence: true, uniqueness: true
    validates :status, inclusion: { in: STATUSES }

    before_save { self[:state] = status }

    def state
      Shopcore.deprecator.warn("Shopcore::Order#state is deprecated; use #status instead")
      status
    end
  end
end
