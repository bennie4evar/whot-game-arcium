use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct GameInput {
        player1_card: u8,
        player2_card: u8,
    }

    #[derive(Clone, Copy)]
    pub struct GameResult {
        winner: u8,
        revealed_card: u8,
        is_tie: u8,
        p1_card_if_tie: u8,
        p2_card_if_tie: u8,
    }

    #[instruction]
    pub fn compare_cards(input: Enc<Shared, GameInput>) -> Enc<Shared, GameResult> {
        let cards = input.to_arcis();
        let p1 = cards.player1_card;
        let p2 = cards.player2_card;

        let mut winner: u8 = 0;
        let mut revealed_card: u8 = 0;
        let mut is_tie: u8 = 0;
        let mut p1_card_if_tie: u8 = 0;
        let mut p2_card_if_tie: u8 = 0;

        if p1 > p2 {
            winner = 1;
            revealed_card = p1;
        } else {
            if p1 == p2 {
                winner = 0;
                is_tie = 1;
                p1_card_if_tie = p1;
                p2_card_if_tie = p2;
                revealed_card = p1;
            } else {
                winner = 2;
                revealed_card = p2;
            }
        }

        let result = GameResult {
            winner,
            revealed_card,
            is_tie,
            p1_card_if_tie,
            p2_card_if_tie,
        };

        input.owner.from_arcis(result)
    }
}
