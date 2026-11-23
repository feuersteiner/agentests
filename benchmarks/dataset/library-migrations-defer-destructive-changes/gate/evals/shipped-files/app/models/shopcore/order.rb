module Shopcore
  class Order < ActiveRecord::Base
    STATES = %w[cart placed paid shipped cancelled].freeze

    belongs_to :user, class_name: "::User"

    validates :number, presence: true, uniqueness: true
    validates :state, inclusion: { in: STATES }

    scope :open, -> { where(state: %w[cart placed paid]) }

    def place!
      update!(state: "placed", placed_at: Time.current)
    end

    def cancel!
      update!(state: "cancelled")
    end

    def total
      Shopcore::Money.format(total_cents, currency)
    end
  end
end
