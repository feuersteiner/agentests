from app import cli, storage


def add_dataset(name: str, size: int) -> None:
    storage.upload_bytes(storage.DATASETS, name, b"\x00" * size, "application/vnd.apache.parquet")


def test_datasets_lists_every_blob_with_its_size(capsys):
    add_dataset("training/2026-09.parquet", 2048)
    add_dataset("holdout/2026-09.parquet", 100)

    assert cli.main(["datasets"]) == 0

    assert capsys.readouterr().out.splitlines() == [
        "holdout/2026-09.parquet\t100",
        "training/2026-09.parquet\t2048",
    ]


def test_latest_training_dataset_is_the_newest_month():
    add_dataset("training/2026-09.parquet", 10)
    add_dataset("training/2026-10.parquet", 10)
    add_dataset("holdout/2026-11.parquet", 10)

    assert cli.latest_training_dataset() == "training/2026-10.parquet"


def test_upload_dataset_stores_the_file_as_that_months_training_set(tmp_path, blobs):
    source = tmp_path / "train.parquet"
    source.write_bytes(b"PAR1")

    assert cli.main(["upload-dataset", str(source), "2026-11"]) == 0

    assert blobs[(storage.DATASETS, "training/2026-11.parquet")].data == b"PAR1"


def test_unknown_commands_print_usage(capsys):
    assert cli.main(["nope"]) == 2
    assert "usage" in capsys.readouterr().err
