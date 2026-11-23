require "copperleaf/money"

class Order < ApplicationRecord
  STATUSES = %w[pending paid shipped cancelled].freeze

  belongs_to :user

  validates :status, inclusion: { in: STATUSES }
  validates :total, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def total_display
    Copperleaf::Money.format_cents(total)
  end
end
