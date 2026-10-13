import unittest
from main import Request, optimize


class OptimizerTest(unittest.TestCase):
    def request(self, **cargo):
        return Request.model_validate({"cargos": [{"id": "a", "itemNo": "A", "quantity": 3,
            "length": 4000, "width": 2800, "height": 3000, "grossWeight": 10000, **cargo}],
            "equipment": [{"code": "40FR", "length": 12000, "width": 2400, "height": 2200,
                           "payload": 40000, "openWidth": True, "openHeight": True}],
            "rules": [{"equipmentCode": "40FR", "usableLengthRatio": .94,
                       "planningWeightRatio": .9, "maxOverWidth": 1600, "maxOverHeight": 1800}]})

    def test_all_pieces_and_no_overlap(self):
        result = optimize(self.request())["scenarios"][0]
        self.assertEqual(result["equipmentCount"], 2)
        self.assertEqual(sum(len(b["assignments"]) for b in result["containers"]), 3)
        for box in result["containers"]:
            self.assertLessEqual(box["weight"], box["payloadLimit"])
            self.assertLessEqual(box["usedLength"], box["usableLength"])
            assignments = box["assignments"]
            for a, b in zip(assignments, assignments[1:]):
                self.assertLessEqual(a["x"] + a["length"], b["x"])

    def test_overweight_is_unassigned(self):
        result = optimize(self.request(grossWeight=36001))["scenarios"][0]
        self.assertEqual(result["equipmentCount"], 0)
        self.assertEqual(len(result["unassigned"]), 3)

    def test_exact_limit_and_rotation(self):
        result = optimize(self.request(quantity=1,length=2800,width=11000,rotationAllowed=True,grossWeight=36000))["scenarios"][0]
        self.assertEqual(result["equipmentCount"],1)
        self.assertTrue(result["containers"][0]["assignments"][0]["rotated"])

    def test_impossible_width(self):
        result = optimize(self.request(width=4001))["scenarios"][0]
        self.assertEqual(len(result["unassigned"]),3)


if __name__ == "__main__":
    unittest.main()
