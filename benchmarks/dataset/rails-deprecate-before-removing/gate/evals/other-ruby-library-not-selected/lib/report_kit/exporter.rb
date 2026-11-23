require "csv"

module ReportKit
  # Writes report rows as CSV. Renamed from to_csv to write_csv; the old name is gone.
  class Exporter
    def initialize(rows, headers:)
      @rows = rows
      @headers = headers
    end

    def write_csv(io)
      io << CSV.generate_line(@headers)
      @rows.each { |row| io << CSV.generate_line(row.values_at(*@headers)) }
      io
    end
  end
end
